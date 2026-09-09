import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// A channel upload is addressed by a bare number, so the prefix is optional.
const safeVideoIdRegex = /^(?:[a-z]{2})?\d+$/

// lv names a live broadcast, which the video player answers 500 for and the live host serves as a
// programme card even after the broadcast ends.
const liveIdRegex = /^lv\d+$/

const nicovideoHosts = ['nicovideo.jp']

// Seiga and manga write ext.{site}.nicovideo.jp/thumb/{kind}{digits}, and news writes
// news.nicovideo.jp/watch/nw{digits}.
const nonVideoHosts = ['seiga.nicovideo.jp', 'manga.nicovideo.jp', 'news.nicovideo.jp']

export const extractNicovideoId = (link: string): string | undefined => {
  // The script selector matches on a substring, so any host can spell `nicovideo.jp/thumb_watch`
  // inside its own path and reach this. The path shape alone must not mint a nicovideo url.
  const parsed = parseUrlOnHosts(link, nicovideoHosts)

  // Seiga, manga and news ids pass the video grammar, and the video player answers 500 for them.
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

  // A broadcast is served by the live host and nothing else, so the two kinds do not share a
  // player url. No size is stated for it: a guess would outrank the height the carrier states.
  if (liveIdRegex.test(videoId)) {
    return {
      provider: 'nicovideo',
      id: videoId,
      src: `https://live.nicovideo.jp/embed/${videoId}`,
      url: `https://live.nicovideo.jp/watch/${videoId}`,
    }
  }

  // embed.nicovideo.jp/watch/{id} answers a real id 200 with the title and an invented one 500.
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
// Nicovideo answers it with a 302 to embed.nicovideo.jp/watch/{id}/script.
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

    // A lone height would claim a fixed box the fluid player does not have.
    if (!width || !height) {
      return result
    }

    return { ...result, width, height }
  },
)
