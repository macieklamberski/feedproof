import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'rutube'

// Hex with at least one digit.
const safeVideoIdRegex = /^(?=[0-9a-f]*\d)[0-9a-f]+$/

const rutubeHosts = ['rutube.ru']

const embedPathRegex = /^\/(?:play\/embed|video\/embed|embed)\/([^/]+)\/?$/
const playlistPathRegex = /^\/pl\/?$/

const rutubeEmbedParams = ['p', 't', 'stopTime']

const composeEmbed = (videoId: string, link: string): EmbedResolverResult => {
  return {
    provider,
    id: videoId,
    src: `https://rutube.ru/play/embed/${videoId}${pickUrlParams(link, rutubeEmbedParams)}`,
    url: `https://rutube.ru/video/${videoId}/`,
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
  autoplayParams: { autoplay: 'true' },
}
