import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// Video ids are a two-letter kind and a number, `sm9`, `nm12345`, `so67890`.
const safeVideoIdRegex = /^[a-z]{2}\d+$/

// The script states the size it wants, `?w=490&h=307`.

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
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const marker = segments.findIndex((segment) => {
    return segment === 'thumb_watch' || segment === 'thumb' || segment === 'watch'
  })
  const videoId = marker < 0 ? undefined : segments[marker + 1]

  if (videoId && safeVideoIdRegex.test(videoId)) {
    return videoId
  }
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
export const nicovideoIframeEmbedResolver = createIframeEmbedResolver(
  nicovideoHosts,
  nicovideoResolveEmbed,
)

export const nicovideoScriptEmbedResolver: EmbedResolver = {
  selector: 'script[src*="nicovideo.jp/thumb_watch"], script[src*="embed.nicovideo.jp/watch"]',
  extract: (element): EmbedResolverResult | undefined => {
    const source = attr(element, 'src') ?? ''
    const result = nicovideoResolveEmbed(source)

    if (!result) {
      return
    }

    // A player is a ratio rather than a fixed box, so both dimensions are carried when the
    // script states them: the reader turns a width and height pair into an aspect ratio and
    // scales the player to the column, which is what a video wants.
    const parsed = parseUrl(source, 'https://example.com')
    const width = parsePixelSize(parsed?.searchParams.get('w'))
    const height = parsePixelSize(parsed?.searchParams.get('h'))

    if (!width || !height) {
      return result
    }

    return { ...result, width, height }
  },
}
