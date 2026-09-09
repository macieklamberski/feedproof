import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

// One service, three host generations, all still live in feeds: `anchor.fm` became
// `podcasters.spotify.com` became `creators.spotify.com`. The Spotify resolver matches the
// spotify.com hosts but rejects these paths, so they fall through to here.
const anchorHosts = ['anchor.fm', 'podcasters.spotify.com', 'creators.spotify.com']

// Spotify's snippet writes 102, but the card is 100 and the two extra pixels render as white.
// `anchor.fm` and `podcasters.spotify.com` both redirect to the `creators.spotify.com` player.
// From 768 wide up the card is 161 tall, and the page fills any taller frame with white.
const playerHeight = 100

// `anchor.fm/{show}/embed/episodes/{slug}`,
// `podcasters.spotify.com/pod/show/{show}/embed/episodes/{slug}`,
// `creators.spotify.com/pod/profile/{user}/embed/episodes/{slug}/{audioId}`.
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

  // The player carries no metadata, and Anchor's old oEmbed endpoint is gone.
  return {
    provider: 'anchor',
    id: episode,
    // The host is kept: the three generations are not known to be interchangeable.
    src: parsed.href,
    height: playerHeight,
  }
}

// Anchor's episode player iframe, on the anchor.fm host and the two Spotify hosts it became.
export const anchorEmbedResolver = createUrlEmbedResolver(anchorHosts, anchorResolveEmbed)
