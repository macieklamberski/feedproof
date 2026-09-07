import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const foxnewsHosts = ['video.foxnews.com']

// The player fills whatever frames it (`html, body { width: 100%; height: 100% }` on the embed
// page), and Fox's own numbers for it are 16:9 throughout: 640 by 360 in the page's `og:video`
// and in the iframe publishers paste, 466 by 263 in the script snippet.
const playerRatio = '16/9'

// `video-embed.html` is what Fox names as the player in the video page's `twitter:player` and
// `embedUrl`. Checked live 2026-09-06: 200 for a real id, a 2011 id included, 404 for an
// invented one.
const composeEmbed = (id: string): EmbedResolverResult => {
  return {
    provider: 'foxnews',
    id,
    src: `https://video.foxnews.com/v/video-embed.html?video_id=${id}`,
    url: `https://www.foxnews.com/video/${id}`,
    ratio: playerRatio,
  }
}

// Both carriers name the video in a query parameter: `id` on the script, `video_id` on the
// iframe. Everything else in the query is the snippet's size or the embedding page's referrer.
export const foxnewsResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, foxnewsHosts)
  const id = parsed?.searchParams.get('video_id') ?? parsed?.searchParams.get('id')
  const [route, page] = parsed ? getPathSegments(parsed) : []

  if (route !== 'v' || (page !== 'embed.js' && page !== 'video-embed.html')) {
    return
  }

  return id && safeIdRegex.test(id) ? composeEmbed(id) : undefined
}

// Fox's old share snippet is `embed.js?id=…&w=…&h=…` beside a `<noscript>` link to the video
// site. The script no longer exists (404), so even on the page it was pasted into nothing plays,
// while the video itself still serves from the embed page the id names.
export const foxnewsScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="video.foxnews.com/v/embed.js"]',
  (element) => {
    return foxnewsResolveEmbed(attr(element, 'src') ?? '')
  },
)

export const foxnewsIframeEmbedResolver = createUrlEmbedResolver(foxnewsHosts, foxnewsResolveEmbed)
