import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
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

// Omny publishes a registry oEmbed, so tagging provider and id is what lets the enricher fetch
// a title and artwork later. Offline this states the height the markup often omits.
export const omnyResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const clip = extractOmnyClip(url)

  if (!clip) {
    return
  }

  // The query is carried through. `style=cover` and `size=` change the player's shape, so
  // rebuilding a bare url would hand the publisher a different embed than the one they chose.
  const query = parseUrl(url, placeholderBaseUrl)?.search ?? ''

  return {
    provider,
    id: clip,
    src: `https://omny.fm/shows/${clip}/embed${query}`,
    height: playerHeight,
  }
}

export const omnyEmbedResolver = createUrlEmbedResolver(omnyHosts, omnyResolveEmbed)

// Starts playback on the click that loads the player.
export const omnyRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
