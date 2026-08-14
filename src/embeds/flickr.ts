import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { flashVars } from '../utils/dom.js'
import { createUrlEmbedResolver, getEmbedDimensions } from '../utils/widgets.js'

const flickrHosts = ['flickr.com']

// Two dead carriers, both from the Flash era. The `<object>`/`<embed>` pair plays the swf, and
// the iframe points at a page that answers `x-frame-options: SAMEORIGIN` and so renders an
// empty frame. Neither shows anything today.
const flashPlayerPathRegex = /^\/apps\/slideshow\//
const legacyPlayerPathRegex = /^\/slideshow\/index\.gne$/i

// The swf url names only the player, with a cache-busting `?v=` that is identical on every
// slideshow ever pasted. The set is in the flashvars, as a percent-encoded path that
// `URLSearchParams` decodes: `page_show_url=%2Fphotos%2F{owner}%2Fsets%2F{setId}%2Fshow%2F`.
//
// Measured across the 534 corpus feeds carrying this carrier: 366 hold `page_show_url` and 316
// hold `set_id`, and **none holds `set_id` without `page_show_url`**, so this key is a strict
// superset and the only one that also yields the owner.
const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/

const safeSetIdRegex = /^\d+$/

// An owner is a numeric NSID with its `@N0…` suffix, or the path alias the owner chose.
const safeOwnerRegex = /^[\w.-]+(?:@N\d\d)?$/

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

// The endpoint renders `width: NaNpx` when it is given no size, so the dimensions travel in the
// url rather than being left to the reader. These are the size Flickr's own dialog wrote for
// years, used only when the carrier states nothing.
const defaultWidth = 400
const defaultHeight = 300

const withSize = (player: string, width: number, height: number): string => {
  return `${player}?width=${width}&height=${height}`
}

// The swf carrier, whose set lives in the flashvars beside it.
const readFlashSet = (element: Element): { owner: string; setId: string } | undefined => {
  const config = flashVars(element)
  const match = config && new URLSearchParams(config).get('page_show_url')?.match(setPathRegex)

  return match && safeOwnerRegex.test(match[1]) ? { owner: match[1], setId: match[2] } : undefined
}

// The iframe carrier, whose subject is in its own query. Of the 112 corpus feeds carrying it,
// 94 name a set and 90 name a user, so both are worth reading; the 6 naming a group are not,
// since `embedr.flickr.com/groups/…` answers 404. A set is preferred where both appear, being
// the narrower of the two.
const readLegacyQuery = (parsed: URL): EmbedResolverResult | undefined => {
  const setId = parsed.searchParams.get('set_id')
  const owner = parsed.searchParams.get('user_id')

  if (setId && safeSetIdRegex.test(setId)) {
    return owner && safeOwnerRegex.test(owner)
      ? { provider: 'flickr', id: `${owner}/${setId}`, src: composeAlbumPlayer(setId) }
      : { provider: 'flickr', id: `photosets/${setId}`, src: composeAlbumPlayer(setId) }
  }

  if (owner && safeOwnerRegex.test(owner)) {
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

  let result: EmbedResolverResult | undefined

  if (flashPlayerPathRegex.test(parsed.pathname)) {
    const set = readFlashSet(element)

    result = set && {
      provider: 'flickr',
      // The player takes the set alone, but the album's oEmbed is keyed by the page url, which
      // needs the owner too: it answers `flickr_type: album` with a title, an author and a
      // thumbnail, all key-free (checked 2026-08-14). So the id carries the pair, or enrichment
      // cannot address the one endpoint that would give this placeholder a poster.
      id: `${set.owner}/${set.setId}`,
      src: composeAlbumPlayer(set.setId),
      // The album page, kept as the markup spelled it minus the `/show/` suffix that names the
      // slideshow view. `/sets/{id}` is still served and does not redirect to `/albums/{id}`,
      // so rewriting it would change the publisher's url for no gain (both 200, 2026-08-14).
      url: `https://www.flickr.com/photos/${set.owner}/sets/${set.setId}`,
    }
  } else if (legacyPlayerPathRegex.test(parsed.pathname)) {
    result = readLegacyQuery(parsed)
  }

  if (!result) {
    return
  }

  const declared = getEmbedDimensions(element)
  const width = declared.width ?? defaultWidth
  const height = declared.height ?? defaultHeight

  return { ...result, src: withSize(result.src, width, height), width, height }
}

// Both carriers render nothing today, and both name something Flickr's current embed endpoint
// still serves, so each maps onto a working slideshow.
export const flickrEmbedResolver = createUrlEmbedResolver(flickrHosts, flickrResolveEmbed, {
  // The carrier's size is already folded into the src, and it is what the endpoint renders at.
  declaredSize: false,
})
