import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeVideoIdRegex = /^(?:[a-z]{2})?\d+$/

const liveIdRegex = /^lv\d+$/

const nicovideoHosts = ['nicovideo.jp']

const nonVideoHosts = ['seiga.nicovideo.jp', 'manga.nicovideo.jp', 'news.nicovideo.jp']

export const extractNicovideoId = (link: string): string | undefined => {
  const parsed = parseUrlOnHosts(link, nicovideoHosts)

  if (!parsed || parseUrlOnHosts(link, nonVideoHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  const marker = segments.findIndex((segment) => {
    return (
      segment === 'thumb_watch' || segment === 'thumb' || segment === 'watch' || segment === 'embed'
    )
  })

  return keepIfMatches(marker < 0 ? undefined : segments[marker + 1], safeVideoIdRegex)
}

export const nicovideoResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractNicovideoId(url)

  if (!videoId) {
    return
  }

  if (liveIdRegex.test(videoId)) {
    return {
      provider: 'nicovideo',
      id: videoId,
      src: `https://live.nicovideo.jp/embed/${videoId}`,
      url: `https://live.nicovideo.jp/watch/${videoId}`,
    }
  }

  return {
    provider: 'nicovideo',
    id: videoId,
    src: `https://embed.nicovideo.jp/watch/${videoId}`,
    url: `https://www.nicovideo.jp/watch/${videoId}`,
  }
}

// The legacy ext.nicovideo.jp/thumb/{id} iframe card, which now answers 403 to every user agent.
export const nicovideoIframeEmbedResolver = createUrlEmbedResolver(
  nicovideoHosts,
  nicovideoResolveEmbed,
)

// Nicovideo's thumb_watch script writes the player where it stands, and a reader never runs it.
export const nicovideoScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="nicovideo.jp/thumb_watch"], script[src*="embed.nicovideo.jp/watch"]',
  (element) => {
    const source = attr(element, 'src') ?? ''
    const result = nicovideoResolveEmbed(source)

    if (!result) {
      return
    }

    const parsed = parseUrl(source, placeholderBaseUrl)
    const width = parsePixelSize(parsed?.searchParams.get('w'))
    const height = parsePixelSize(parsed?.searchParams.get('h'))

    if (!width || !height) {
      return result
    }

    return { ...result, width, height }
  },
)
