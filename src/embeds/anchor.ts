import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeSegmentRegex = /^[A-Za-z0-9._-]+$/

// One service, three host generations, all still live in feeds: `anchor.fm` became
// `podcasters.spotify.com` became `creators.spotify.com`. The Spotify resolver matches the
// spotify.com hosts but rejects these paths, so they fall through to here.
const anchorHosts = ['anchor.fm', 'podcasters.spotify.com', 'creators.spotify.com']

// One height for all three hosts, because there is one player: the `anchor.fm` and
// `podcasters.spotify.com` spellings both redirect to the `creators.spotify.com` one.
//
// Measured 2026-09-07 in Chrome against two episodes: the painted card, artwork, title, play
// button and progress bar, is 100 tall at 320, 640, 700 and 720 wide and 161 from 768 up, where
// the artwork grows, and the page fills any taller frame with white below the card. So the height
// steps at one breakpoint rather than tracking the width, and a reader's post column sits on the
// short side of it. The 102 is what Spotify's own snippet writes, two more than the card, and
// publishers write it on every host: 2,124 of the 2,532 embed carriers that declare a height
// across 744 corpus feeds. The 245 that declare none are what this reaches, since `decideSize`
// takes the carrier's first.
const playerHeight = 102

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
    height: playerHeight,
  }
}

export const anchorEmbedResolver = createUrlEmbedResolver(anchorHosts, anchorResolveEmbed)
