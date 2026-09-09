import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'rutube'

// Hex with at least one digit, so the route words feed and added, hex letters alone, are refused.
// An id is a uuid with the dashes stripped, and the player still plays the all-digit ids the same
// routes carried before.
const safeVideoIdRegex = /^(?=[0-9a-f]*\d)[0-9a-f]+$/

const rutubeHosts = ['rutube.ru']

const embedPathRegex = /^\/(?:play\/embed|video\/embed|embed)\/([^/]+)\/?$/
const playlistPathRegex = /^\/pl\/?$/

// `p` is the access key a private video will not play without.
const rutubeEmbedParams = ['p', 't', 'stopTime']

const composeEmbed = (videoId: string, link: string): EmbedResolverResult => {
  // rutube.ru/api/video/{id}/ answers key-free with the title, author, duration and a poster, 200
  // for a real id and 404 for an invented one, and the poster file is named by a hash the id does
  // not yield.
  return {
    provider,
    id: videoId,
    src: `https://rutube.ru/play/embed/${videoId}${pickUrlParams(link, rutubeEmbedParams)}`,
    url: `https://rutube.ru/video/${videoId}/`,
    // The player fills its box, and Rutube's snippet and oEmbed size it 720 by 405.
    ratio: '16/9',
  }
}

export const rutubeResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, rutubeHosts)

  if (!parsed) {
    return
  }

  const candidate = playlistPathRegex.test(parsed.pathname)
    ? parsed.searchParams.get('pl_video')
    : parsed.pathname.match(embedPathRegex)?.[1]
  const videoId = keepIfMatches(candidate, safeVideoIdRegex)

  if (!videoId) {
    return
  }

  const result = composeEmbed(videoId, parsed.href)
  const title = attr(element, 'title')

  return title ? { ...result, title } : result
}

// Rutube's player iframe, rutube.ru/play/embed/{id}, and the three older spellings that 301 to it.
export const rutubeEmbedResolver = createUrlEmbedResolver(rutubeHosts, rutubeResolveEmbed)

export const rutubeRenderHint: EmbedRenderHint = {
  provider,
  // Compared as a string: only exactly true flips the player's flag.
  // A start the browser refuses it retries muted, drawing an unmute button over the video.
  autoplayParams: { autoplay: 'true' },
}
