import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

const anchorHosts = ['anchor.fm', 'podcasters.spotify.com', 'creators.spotify.com']

const playerHeight = 100

export const extractAnchorEpisode = (link: string): string | undefined => {
  const segments = getPathSegments(link)
  const marker = segments.indexOf('embed')

  if (marker < 1 || segments[marker + 1] !== 'episodes') {
    return
  }

  const show = segments[marker - 1]
  const episode = segments[marker + 2]

  if (!show || !episode || ![show, episode].every((part) => safeSegmentRegex.test(part))) {
    return
  }

  return `${show}/${episode}`
}

export const anchorResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const episode = extractAnchorEpisode(url)
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!episode || !parsed) {
    return
  }

  return {
    provider: 'anchor',
    id: episode,
    src: parsed.href,
    height: playerHeight,
  }
}

// Anchor's episode player iframe, on the anchor.fm host and the two Spotify hosts it became.
export const anchorEmbedResolver = createUrlEmbedResolver(anchorHosts, anchorResolveEmbed)
