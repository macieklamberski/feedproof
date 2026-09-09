import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver, getEmbedSize } from '../utils/widgets.js'

const flickrHosts = ['flickr.com']

// The swf url names only the player, with a `?v=` cache-buster identical on every slideshow.
const flashPlayerPathRegex = /^\/apps\/slideshow\//i
const legacyPlayerPathRegex = /^\/slideshow\/index\.gne$/i

const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/
const streamPathRegex = /^\/photos\/([\w.@-]+)\/show\/?$/
const groupPathRegex = /^\/groups\/(\d+@N\d\d)\/pool\/show\/?$/

const safeSetIdRegex = /^\d+$/

// The first class admits no dot, so `..` never reaches a minted path.
// An owner is a numeric NSID with its `@N0…` suffix, or the path alias the owner chose.
const safeOwnerRegex = /^[\w-][\w.-]*(?:@N\d\d)?$/

// A group and a photostream each resolve by NSID and only by NSID: the player answers 200 for
// `groups/{nsid}` and for `photostreams/{nsid}`, and 404 for a path alias in either position.
// Feeds spell `group_id` as an NSID in every non-mangled occurrence.
const safeNsidRegex = /^\d+@N\d\d$/

// What a carrier names, whichever carrier and whichever spelling: an album needs its set, a
// group pool its NSID, a photostream only its owner.
type FlickrSubject = { setId?: string; owner?: string; groupId?: string }

// Flickr's own embed script writes these embedr endpoints into a frameless iframe. A real id
// answers 200 with the whole slideshow and an invented one 404.
const composeAlbumPlayer = (setId: string): string => {
  return `https://embedr.flickr.com/photosets/${setId}`
}

const composeStreamPlayer = (owner: string): string => {
  return `https://embedr.flickr.com/photostreams/${owner}`
}

// The page player takes either owner spelling, serves no frame-blocking header and takes the
// same width and height query as embedr.
const composeAliasStreamPlayer = (owner: string): string => {
  return `https://www.flickr.com/photos/${owner}/player`
}

const composeGroupPlayer = (groupId: string): string => {
  return `https://embedr.flickr.com/groups/${groupId}`
}

// Flickr's base58 alphabet for flic.kr short urls.
const base58Alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

// `flic.kr/s/{code}` redirects to the owned album page. Set ids exceed 2^53, so the arithmetic
// is BigInt.
const composeShortAlbumUrl = (setId: string): string => {
  let remaining = BigInt(setId)
  let encoded = ''

  while (remaining > 0n) {
    encoded = base58Alphabet[Number(remaining % 58n)] + encoded
    remaining /= 58n
  }

  return `https://flic.kr/s/${encoded || base58Alphabet[0]}`
}

// The size Flickr's own dialog wrote for years. The slideshow renders at whatever box the query
// names, so there is no rendered height to measure against.
const dialogSize = { width: 400, height: 300 }

// What a page path names, whether it arrived in the flashvars or as the framed page itself.
const readPageSubject = (page: string): FlickrSubject | undefined => {
  const set = page.match(setPathRegex)

  if (set) {
    return { owner: set[1], setId: set[2] }
  }

  const group = page.match(groupPathRegex)

  if (group) {
    return { groupId: group[1] }
  }

  const stream = page.match(streamPathRegex)

  if (stream) {
    return { owner: stream[1] }
  }
}

// The swf carrier names its subject in the flashvars beside it: the page path first, and the
// bare `user_id` for the few snippets that carry nothing else.
const readFlashSubject = (element: Element): FlickrSubject => {
  const config = new URLSearchParams(flashVars(element) ?? '')
  const page = config.get('page_show_url') ?? ''

  return readPageSubject(page) ?? { owner: config.get('user_id') ?? undefined }
}

// The iframe carrier names its subject in its own query. A set is preferred where several
// appear, being the narrowest of the three.
const readLegacySubject = (parsed: URL): FlickrSubject => {
  return {
    setId: parsed.searchParams.get('set_id') ?? undefined,
    owner: parsed.searchParams.get('user_id') ?? undefined,
    groupId: parsed.searchParams.get('group_id') ?? undefined,
  }
}

const composeEmbed = (subject: FlickrSubject): EmbedResolverResult | undefined => {
  const owner = keepIfMatches(subject.owner, safeOwnerRegex)
  // Only the path alias is a name. The NSID spelling of the same owner names nobody a reader
  // could read, and the album and photostream oEmbed answers `author_name` for both anyway.
  const author = owner && !safeNsidRegex.test(owner) ? owner : undefined

  if (subject.setId && safeSetIdRegex.test(subject.setId)) {
    // The album page path starts with the owner, and `/sets/{id}` is kept as the markup spells
    // it: the path is still served and does not redirect to `/albums/` (both 200, 2026-08-14).
    return owner
      ? {
          provider: 'flickr',
          // The album's key-free oEmbed needs `{owner}/{setId}`: a title, an author, a thumbnail.
          id: `${owner}/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: `https://www.flickr.com/photos/${owner}/sets/${subject.setId}`,
          author,
        }
      : {
          provider: 'flickr',
          // Addresses the player but not oEmbed.
          id: `photosets/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: composeShortAlbumUrl(subject.setId),
        }
  }

  if (subject.groupId && safeNsidRegex.test(subject.groupId)) {
    return {
      provider: 'flickr',
      id: `groups/${subject.groupId}`,
      src: composeGroupPlayer(subject.groupId),
      url: `https://www.flickr.com/groups/${subject.groupId}/`,
    }
  }

  // embedr takes the NSID and 404s on an alias, and nothing offline converts one into the
  // other. An alias resolves through the page player instead, which serves both spellings.
  if (owner) {
    return {
      provider: 'flickr',
      id: `photostreams/${owner}`,
      // embedr 404s on an alias, so only an NSID goes there.
      src: safeNsidRegex.test(owner) ? composeStreamPlayer(owner) : composeAliasStreamPlayer(owner),
      url: `https://www.flickr.com/photos/${owner}/`,
      author,
    }
  }
}

export const flickrResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed) {
    return
  }

  let subject: FlickrSubject | undefined

  if (flashPlayerPathRegex.test(parsed.pathname)) {
    subject = readFlashSubject(element)
  } else if (legacyPlayerPathRegex.test(parsed.pathname)) {
    subject = readLegacySubject(parsed)
  } else {
    subject = readPageSubject(parsed.pathname)
  }

  const result = subject && composeEmbed(subject)

  if (!result) {
    return
  }

  const declared = getEmbedSize(element, 0)
  // Both halves or neither: given one half, the endpoint uses its default for the other as is.
  const { width, height } =
    declared.width && declared.height
      ? { width: declared.width, height: declared.height }
      : dialogSize

  // The size always travels in the src: with no query every image renders at NaN.
  return { ...result, src: `${result.src}?width=${width}&height=${height}`, width, height }
}

// Flickr's slideshow swf, legacy iframe or framed album page, none of which renders today.
// Every flickr.com page answers `x-frame-options: SAMEORIGIN`, so both iframes render empty.
export const flickrEmbedResolver = createUrlEmbedResolver(flickrHosts, flickrResolveEmbed, {
  // The carrier's size is already folded into the src, and it is what the endpoint renders at.
  preferResolverSize: true,
})
