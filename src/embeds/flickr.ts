import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { flashVars } from '../utils/dom.js'
import { createUrlEmbedResolver, getEmbedDimensions } from '../utils/widgets.js'

const flickrHosts = ['flickr.com']

const flashPlayerPathRegex = /^\/apps\/slideshow\//

// The swf url names only the player, with a cache-busting `?v=` that is identical on every
// slideshow ever pasted. The set is in the flashvars, as a percent-encoded path that
// `URLSearchParams` decodes: `page_show_url=%2Fphotos%2F{owner}%2Fsets%2F{setId}%2Fshow%2F`.
const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/

// Flickr's own embed script builds a frameless iframe and writes this endpoint's response into
// it, so the url it fetches is exactly what an `src` can carry. The album form takes the set
// alone and drops the owner. Unlike most player hosts it discriminates: a real set answers 200
// with the slideshow, an invented one answers 404 (checked 2026-08-14).
const composePlayerUrl = (setId: string, width: number, height: number): string => {
  return `https://embedr.flickr.com/photosets/${setId}?width=${width}&height=${height}`
}

// The endpoint renders `width: NaNpx` when it is given no size, so the dimensions travel in the
// url rather than being left to the reader. These are the size Flickr's own dialog wrote for
// years, used only when the carrier states nothing.
const defaultWidth = 400
const defaultHeight = 300

const flickrFlashResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const config = flashVars(element)
  const match = config && new URLSearchParams(config).get('page_show_url')?.match(setPathRegex)

  if (!match) {
    return
  }

  const [, owner, setId] = match
  const declared = getEmbedDimensions(element)
  const width = declared.width ?? defaultWidth
  const height = declared.height ?? defaultHeight

  return {
    provider: 'flickr',
    // The player takes the set alone, but the album's oEmbed is keyed by the page url, which
    // needs the owner too: it answers `flickr_type: album` with a title, an author and a
    // thumbnail, all key-free (checked 2026-08-14). So the id carries the pair, or enrichment
    // cannot address the one endpoint that would give this placeholder a poster.
    id: `${owner}/${setId}`,
    src: composePlayerUrl(setId, width, height),
    // The album page, kept as the markup spelled it minus the `/show/` suffix that names the
    // slideshow view. `/sets/{id}` is still served and does not redirect to `/albums/{id}`,
    // so rewriting it would change the publisher's url for no gain (both 200, 2026-08-14).
    url: `https://www.flickr.com/photos/${owner}/sets/${setId}`,
    width,
    height,
  }
}

// Flash has rendered nothing since 2021, so the placeholder the generic carrier builds points
// at a `.swf` no browser can run. The set id survives in the flashvars, and Flickr's current
// embed endpoint takes a set id alone, so the dead slideshow maps onto a working one.
export const flickrFlashEmbedResolver = createUrlEmbedResolver(
  flickrHosts,
  flickrFlashResolveEmbed,
  // The carrier's size is already folded into the src, and it is what the endpoint renders at.
  { declaredSize: false },
)
