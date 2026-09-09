import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { composeQuery, pickQueryParams, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'omny'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

const omnyHosts = ['omny.fm']

// Carriers state 180 with and without style=cover and Omny's oEmbed agrees, but neither shape was
// measured in a browser.
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

// A publisher's autoplay is left out: minted here it would start playback for every consumer.
// style and size pick the player's shape, media the audio rendering of a show that also serves
// video, and t a position in the episode.
const omnyEmbedParams = ['media', 'size', 'style', 't']

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
    ...trimObject({ title }, Boolean),
  }
}

// The omny.fm/shows/{show}/{clip}/embed player iframe, often pasted without a height.
export const omnyEmbedResolver = createUrlEmbedResolver(omnyHosts, omnyResolveEmbed)

// Starts playback on the click that loads the player.
export const omnyRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
