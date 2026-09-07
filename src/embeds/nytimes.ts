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

// Measured 2026-09-06 in a browser at 300 and 600 pixels wide: the video is 16:9 of the width
// (169 and 338) with a 71 pixel footer of the paper's name and share buttons under it. The
// footer does not scale, so the ratio describes the video and leaves the footer out; NYT's own
// snippet sizes the same player 480 by 321, 16:9 plus 51.
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

  return {
    provider: 'nytimes',
    id,
    src: `https://www.nytimes.com${playerPath}?videoId=${id}`,
    ratio: playerRatio,
  }
}

// Every pasted iframe titles itself "New York Times Video - Embed Player", so the carrier's
// title is not read.
export const nytimesIframeEmbedResolver = createUrlEmbedResolver(nytimesHosts, nytimesResolveEmbed)
