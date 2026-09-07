import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

// One service, three host generations, all still live in feeds: `anchor.fm` became
// `podcasters.spotify.com` became `creators.spotify.com`. The Spotify resolver matches the
// spotify.com hosts but rejects these paths, so they fall through to here.
const anchorHosts = ['anchor.fm', 'podcasters.spotify.com', 'creators.spotify.com']

// The anchor and podcasters players are 102 tall, the creators one 204.
//
// Measured 2026-09-07 in Chrome: `anchor.fm/{show}/embed/episodes/{slug}` and the podcasters
// spelling both redirect to `creators.spotify.com/pod/profile/{show}/embed/episodes/{slug}`, so
// the three hosts serve one player today. Its painted card, artwork, title, play button and
// progress bar, is 100 tall at 320 and 640 wide and 161 at 1280, where the artwork grows; the
// page fills any taller frame with white below the card. So 102 matches the card at post-column
// widths on every host, and 204 has no rendered counterpart. Publishers write 102 on all three:
// 98 of 111 anchor.fm iframes, 58 of 65 podcasters ones and 13 of 14 creators ones in the corpus
// feeds the census lists. Left as is here because a size change is a behaviour change. Either
// number only fires when the carrier states no size, since `decideSize` takes the carrier's
// first.
const playerHeights = { creators: 204, other: 102 }

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

// No offline metadata: the player carries none and Anchor's old oEmbed endpoint is gone, so
// what this states is the provider, the episode and a height the markup often omits. The src
// keeps its own host: the three generations are not known to be interchangeable, and minting
// an unverified rewrite would risk a working embed.
export const anchorResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const episode = extractAnchorEpisode(url)
  const parsed = parseUrl(url, 'https://example.com')

  if (!episode || !parsed) {
    return
  }

  return {
    provider: 'anchor',
    id: episode,
    src: parsed.href,
    height: parsed.hostname.startsWith('creators.') ? playerHeights.creators : playerHeights.other,
  }
}

export const anchorEmbedResolver = createUrlEmbedResolver(anchorHosts, anchorResolveEmbed)
