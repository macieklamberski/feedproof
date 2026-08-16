import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver, getEmbedDimensions } from '../utils/widgets.js'

const flickrHosts = ['flickr.com']

// Two dead carriers, both from the Flash era, and both naming either an album or a whole
// photostream. The `<object>`/`<embed>` pair plays the swf, and the iframe points at a page
// that answers `x-frame-options: SAMEORIGIN` and so renders an empty frame. Neither shows
// anything today.
const flashPlayerPathRegex = /^\/apps\/slideshow\//i
const legacyPlayerPathRegex = /^\/slideshow\/index\.gne$/i

// The swf url names only the player, with a cache-busting `?v=` that is identical on every
// slideshow ever pasted. The subject is in the flashvars, as a percent-encoded page path that
// `URLSearchParams` decodes: `/photos/{owner}/sets/{setId}/show/` for an album and
// `/photos/{owner}/show/` for a photostream.
//
// Measured across the 534 corpus feeds carrying this carrier: 366 hold `page_show_url` and 316
// hold `set_id`, and none holds `set_id` without `page_show_url`, so the path is the one key
// worth reading and the only one that also yields the owner. The photostream form is rare, 5
// feeds, plus 6 that name the owner only in `user_id`.
const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/
const streamPathRegex = /^\/photos\/([\w.@-]+)\/show\/?$/
const groupPathRegex = /^\/groups\/(\d+@N\d\d)\/pool\/show\/?$/

const safeSetIdRegex = /^\d+$/

// An owner is a numeric NSID with its `@N0…` suffix, or the path alias the owner chose. The
// leading class excludes a dots-only segment, so `..` cannot reach a minted path.
const safeOwnerRegex = /^[\w-][\w.-]*(?:@N\d\d)?$/

// A group only resolves by its NSID: the player answers 200 for `groups/{nsid}` and 404 for a
// group's path alias (both checked live 2026-08-14), and the corpus spells `group_id` as an
// NSID in every non-mangled occurrence, 23 feeds.
const safeGroupRegex = /^\d+@N\d\d$/

// What a carrier names, whichever carrier and whichever spelling: an album needs its set, a
// group pool its NSID, a photostream only its owner.
type FlickrSubject = { setId?: string; owner?: string; groupId?: string }

// Flickr's own embed script builds a frameless iframe and writes one of these endpoints into it,
// so what it fetches is exactly what an `src` can carry. Both discriminate rather than shelling:
// a real id answers 200 with the whole slideshow, an invented one answers 404 (2026-08-14). The
// album form drops the owner, which is what lets a carrier naming only a set still resolve.
const composeAlbumPlayer = (setId: string): string => {
  return `https://embedr.flickr.com/photosets/${setId}`
}

const composeStreamPlayer = (owner: string): string => {
  return `https://embedr.flickr.com/photostreams/${owner}`
}

const composeGroupPlayer = (groupId: string): string => {
  return `https://embedr.flickr.com/groups/${groupId}`
}

// Flickr's short urls are the set id in base58, and `flic.kr/s/{code}` goes through the
// platform's own redirector to the owned album page, so the page is reachable even when the
// markup never names the owner. Checked live 2026-08-14: a real set lands on
// `flickr.com/photos/{owner}/sets/{setId}/` and an invented one answers 404. Set ids exceed
// 2^53, so the arithmetic is BigInt.
const base58Alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

const composeShortAlbumUrl = (setId: string): string => {
  let remaining = BigInt(setId)
  let encoded = ''

  while (remaining > 0n) {
    encoded = base58Alphabet[Number(remaining % 58n)] + encoded
    remaining /= 58n
  }

  return `https://flic.kr/s/${encoded || base58Alphabet[0]}`
}

// The endpoint renders `width: NaNpx` when it is given no size, so the dimensions travel in the
// url rather than being left to the reader. These are the size Flickr's own dialog wrote for
// years, used only when the carrier states nothing.
const defaultWidth = 400
const defaultHeight = 300

// The swf carrier names its subject in the flashvars beside it: the page path first, and the
// bare `user_id` for the few snippets that carry nothing else.
const readFlashSubject = (element: Element): FlickrSubject => {
  const config = new URLSearchParams(flashVars(element) ?? '')
  const page = config.get('page_show_url') ?? ''
  const set = page.match(setPathRegex)

  if (set) {
    return { owner: set[1], setId: set[2] }
  }

  const group = page.match(groupPathRegex)

  if (group) {
    return { groupId: group[1] }
  }

  const stream = page.match(streamPathRegex)

  return { owner: stream?.[1] ?? config.get('user_id') ?? undefined }
}

// The iframe carrier names its subject in its own query. Of the 112 corpus feeds carrying it,
// 94 name a set and 90 name a user. A set is preferred where several appear, being the
// narrowest of the three.
const readLegacySubject = (parsed: URL): FlickrSubject => {
  return {
    setId: parsed.searchParams.get('set_id') ?? undefined,
    owner: parsed.searchParams.get('user_id') ?? undefined,
    groupId: parsed.searchParams.get('group_id') ?? undefined,
  }
}

// One composer for both carriers. The id takes one of four shapes, and the segment before the
// slash is what tells them apart: `{owner}/{setId}` when the markup names both, which is what
// the album's key-free oEmbed needs (it answers `flickr_type: album` with a title, an author
// and a thumbnail, checked 2026-08-14); `photosets/{setId}` when the owner is absent, which
// still addresses the player but not oEmbed; `groups/{nsid}` for a group pool; and
// `photostreams/{owner}` for a stream.
const composeEmbed = (subject: FlickrSubject): EmbedResolverResult | undefined => {
  const owner = keepIfMatches(subject.owner, safeOwnerRegex)

  if (subject.setId && safeSetIdRegex.test(subject.setId)) {
    // The album page path starts with the owner, and `/sets/{id}` is kept as the markup spells
    // it: the path is still served and does not redirect to `/albums/` (both 200, 2026-08-14).
    return owner
      ? {
          provider: 'flickr',
          id: `${owner}/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: `https://www.flickr.com/photos/${owner}/sets/${subject.setId}`,
        }
      : {
          provider: 'flickr',
          id: `photosets/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: composeShortAlbumUrl(subject.setId),
        }
  }

  if (subject.groupId && safeGroupRegex.test(subject.groupId)) {
    return {
      provider: 'flickr',
      id: `groups/${subject.groupId}`,
      src: composeGroupPlayer(subject.groupId),
      url: `https://www.flickr.com/groups/${subject.groupId}/`,
    }
  }

  if (owner) {
    return {
      provider: 'flickr',
      id: `photostreams/${owner}`,
      src: composeStreamPlayer(owner),
      url: `https://www.flickr.com/photos/${owner}/`,
    }
  }
}

export const flickrResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  let subject: FlickrSubject | undefined

  if (flashPlayerPathRegex.test(parsed.pathname)) {
    subject = readFlashSubject(element)
  } else if (legacyPlayerPathRegex.test(parsed.pathname)) {
    subject = readLegacySubject(parsed)
  }

  const result = subject && composeEmbed(subject)

  if (!result) {
    return
  }

  const declared = getEmbedDimensions(element)
  const width = declared.width ?? defaultWidth
  const height = declared.height ?? defaultHeight

  return { ...result, src: `${result.src}?width=${width}&height=${height}`, width, height }
}

// Both carriers render nothing today, and both name something Flickr's current embed endpoint
// still serves, so each maps onto a working slideshow.
export const flickrEmbedResolver = createUrlEmbedResolver(flickrHosts, flickrResolveEmbed, {
  // The carrier's size is already folded into the src, and it is what the endpoint renders at.
  declaredSize: false,
})
