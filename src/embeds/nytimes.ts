import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const nytimesHosts = ['nytimes.com']

const safeIdRegex = /^\d+$/

// The player pages: the current one, which `graphics8.nytimes.com` 301s onto `www`, and the
// Brightcove-era `bcvideo` one, which answers 400 for every id today. Both name the video the
// same way, and the current player plays a 2011 `bcvideo` id, so the repair is a path swap.
const playerPath = '/video/players/offsite/index.html'
const legacyPlayerPath = '/bcvideo/1.0/iframe/embed.html'

// A fixed footer sits under the video, so the ratio describes the video alone.
// NYT's own snippet sizes the player 480 by 321.
const playerRatio = '16/9'

// The video page is `/video/{section}/{id}/{slug}.html`, and neither the section nor the slug is
// in the embed, so no `url` is minted. The player discriminates in a browser only: a fabricated
// id answers 200 with the same 695 byte shell and renders "Video Data Failed to Load".
export const nytimesResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, nytimesHosts)
  const id = parsed?.searchParams.get('videoId')

  if (parsed?.pathname !== playerPath && parsed?.pathname !== legacyPlayerPath) {
    return
  }

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  // Every pasted iframe titles itself "New York Times Video - Embed Player".
  return {
    provider: 'nytimes',
    id,
    src: `https://www.nytimes.com${playerPath}?videoId=${id}`,
    ratio: playerRatio,
  }
}

// The Brightcove-era nytimes.com/bcvideo iframe player, which answers 400 for every id today.
export const nytimesIframeEmbedResolver = createUrlEmbedResolver(nytimesHosts, nytimesResolveEmbed)
