import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

const omnyHosts = ['omny.fm']

// 180 in the majority of sampled corpus iframes, and Omny's own oEmbed agrees.
const playerHeight = 180

// `/shows/{show}/{clip}/embed` is a clip and `/shows/{show}/playlists/{slug}/embed` a playlist.
// White-label customers serve the same paths from their own domain, which host matching cannot
// reach: those keep the generic placeholder.
export const extractOmnyClip = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)

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
// a title and artwork later; offline this states the height the markup often omits.
export const omnyResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const clip = extractOmnyClip(url)

  if (!clip) {
    return
  }

  // The query is carried through rather than dropped. `style=cover` and `size=` change the
  // player's shape, so rebuilding a bare url would hand the publisher a different embed than
  // the one they chose, and the height stated below was measured on specimens that had them.
  const query = parseUrl(url, 'https://example.com')?.search ?? ''

  return {
    provider: 'omny',
    id: clip,
    src: `https://omny.fm/shows/${clip}/embed${query}`,
    height: playerHeight,
  }
}

export const omnyEmbedResolver = createUrlEmbedResolver(omnyHosts, omnyResolveEmbed)
