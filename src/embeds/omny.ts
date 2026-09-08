import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { composeQuery, pickQueryParams, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'omny'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

const omnyHosts = ['omny.fm']

// The height most carriers state, and Omny's own oEmbed agrees. Neither player shape was loaded
// in a browser, so this is what publishers declare and not what either one renders. It does span
// both shapes: of 99 omny.fm frames in a 1/16 corpus sample, 39 carried `style=cover` and 60 did
// not, and this is the height stated on 35 and 55 of them.
const playerHeight = 180

// `/shows/{show}/{clip}/embed` is a clip and `/shows/{show}/playlists/{slug}/embed` a playlist.
// White-label customers serve the same paths from their own domain, which host matching cannot
// reach: those keep the generic placeholder.
export const extractOmnyClip = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  if (segments[0] !== 'shows' || segments[segments.length - 1] !== 'embed') {
    return
  }

  const path = segments.slice(1, -1)

  if (path.length < 2 || !path.every((segment) => safeSegmentRegex.test(segment))) {
    return
  }

  return path.join('/')
}

// What the embed's query is allowed to say. `style` and `size` pick the player's shape and the
// height above was measured on players carrying them, `media` picks the audio rendering of a show
// that also serves video, and `t` names a position in the episode. Those four are everything
// publishers wrote across 99 sampled carriers, in the order they wrote them, so the common
// spelling comes back unchanged.
//
// Everything else is how the player behaves for whoever is reading, which the render hint owns:
// minted here, a publisher's `autoplay` would start playback for every consumer, including one
// that never offered the click.
const omnyEmbedParams = ['media', 'size', 'style', 't']

// Omny publishes a registry oEmbed, so tagging provider and id is what lets the enricher fetch
// a title and artwork later. Offline this states the height the markup often omits.
//
// The carrier's title names the clip rather than the player: across 93 titled frames in a 1/16
// corpus sample the commonest value covered 2% of them.
export const omnyResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const clip = extractOmnyClip(url)

  if (!clip) {
    return
  }

  const query = composeQuery(
    pickQueryParams(parseUrl(url, placeholderBaseUrl)?.search ?? '', omnyEmbedParams),
  )
  const title = attr(element, 'title')

  return {
    provider,
    id: clip,
    src: `https://omny.fm/shows/${clip}/embed${query}`,
    height: playerHeight,
    ...(title && { title }),
  }
}

export const omnyEmbedResolver = createUrlEmbedResolver(omnyHosts, omnyResolveEmbed)

// Starts playback on the click that loads the player.
export const omnyRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
