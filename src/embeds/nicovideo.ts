import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Video ids are a two-letter kind and a number, `sm9`, `nm12345`, `so67890`.
const safeVideoIdRegex = /^[a-z]{2}\d+$/

const nicovideoHosts = ['nicovideo.jp']

// Three spellings, one video, and the legacy two are dead or dying.
//
// `ext.nicovideo.jp/thumb_watch/{id}` is a script that writes the player where it stands. It
// never runs in a reader, so the video is lost: 566 corpus feeds carry it and 498 have no
// nicovideo iframe anywhere. Nicovideo answers it with a **302 to
// `embed.nicovideo.jp/watch/{id}/script`**, so the platform itself names the modern target and
// the id carries across unchanged (checked 2026-08-12).
//
// `ext.nicovideo.jp/thumb/{id}` is the old iframe card, in 345 feeds, and it now answers **403**
// to any user agent. Those embeds render nothing today, so rewriting them to the modern player
// repairs them rather than merely relabelling.
//
// `embed.nicovideo.jp/watch/{id}` is what both become. It is one of the few player hosts where a
// status code means something: a real id answers 200 with the video's title in the document, an
// invented one answers 500.
export const extractNicovideoId = (link: string): string | undefined => {
  // The script selector matches on a substring, so any host can spell `nicovideo.jp/thumb_watch`
  // inside its own path and reach this. The path shape alone must not mint a nicovideo url.
  const parsed = parseUrlOnHosts(link, nicovideoHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const marker = segments.findIndex((segment) => {
    return segment === 'thumb_watch' || segment === 'thumb' || segment === 'watch'
  })
  const videoId = marker < 0 ? undefined : segments[marker + 1]

  return keepIfMatches(videoId, safeVideoIdRegex)
}

export const nicovideoResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractNicovideoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'nicovideo',
    id: videoId,
    src: `https://embed.nicovideo.jp/watch/${videoId}`,
    url: `https://www.nicovideo.jp/watch/${videoId}`,
  }
}

// The dead `ext.nicovideo.jp/thumb/{id}` card, and any modern player already in iframe form.
export const nicovideoIframeEmbedResolver = createUrlEmbedResolver(
  nicovideoHosts,
  nicovideoResolveEmbed,
)

export const nicovideoScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="nicovideo.jp/thumb_watch"], script[src*="embed.nicovideo.jp/watch"]',
  (element) => {
    const source = attr(element, 'src') ?? ''
    const result = nicovideoResolveEmbed(source)

    if (!result) {
      return
    }

    // A player scales to the column rather than sitting in a fixed box, so both dimensions are
    // carried when the script states them: the pair is what a reader scales by, and a lone
    // height would claim a fixed box the player does not have.
    const parsed = parseUrl(source, 'https://example.com')
    const width = parsePixelSize(parsed?.searchParams.get('w'))
    const height = parsePixelSize(parsed?.searchParams.get('h'))

    if (!width || !height) {
      return result
    }

    return { ...result, width, height }
  },
)
