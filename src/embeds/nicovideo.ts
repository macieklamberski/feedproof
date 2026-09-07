import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Video ids are a two-letter kind and a number, `sm9`, `nm12345`, `so67890`. A channel upload
// is also addressed by a bare number, the thread id its watch page was minted under: the player
// answers it 200 with the title like any other id and an invented one 500 (checked 2026-09-05).
const safeVideoIdRegex = /^(?:[a-z]{2})?\d+$/

// `lv` names a live broadcast, which the video player answers 500 for. The shape gives nothing
// away, since `lv` is two letters and a number like every other kind. The live host serves a
// programme card rather than playback, and keeps serving it after the broadcast ends.
const liveIdRegex = /^lv\d+$/

const nicovideoHosts = ['nicovideo.jp']

// The illustration and manga site shares the video site's domain, its `thumb` path word and its
// id grammar: `ext.seiga.nicovideo.jp/thumb/im4572423` and `/thumb/mg316785` both pass the video
// id test on the two-letter prefix and the digits. They are not videos. Checked 2026-09-06: the
// seiga card still answers 200 with the work's own title, while `embed.nicovideo.jp/watch/
// im4572423` answers 500, so reading one as a video would swap a card that renders for a player
// url that does not resolve.
const seigaHosts = ['seiga.nicovideo.jp']

// Three spellings, one video, and the legacy two are dead or dying.
//
// `ext.nicovideo.jp/thumb_watch/{id}` is a script that writes the player where it stands. It
// never runs in a reader, and most feeds carrying it hold no nicovideo iframe beside it, so the
// video is lost. Nicovideo answers it with a 302 to
// `embed.nicovideo.jp/watch/{id}/script`, so the platform itself names the modern target and
// the id carries across unchanged (checked 2026-08-12).
//
// `ext.nicovideo.jp/thumb/{id}` is the old iframe card, and it now answers 403 to any user
// agent. Those embeds render nothing today, so rewriting them to the modern player repairs them
// rather than merely relabelling.
//
// `embed.nicovideo.jp/watch/{id}` is what both become. It is one of the few player hosts where a
// status code means something: a real id answers 200 with the video's title in the document, an
// invented one answers 500.
export const extractNicovideoId = (link: string): string | undefined => {
  // The script selector matches on a substring, so any host can spell `nicovideo.jp/thumb_watch`
  // inside its own path and reach this. The path shape alone must not mint a nicovideo url.
  const parsed = parseUrlOnHosts(link, nicovideoHosts)

  if (!parsed || parseUrlOnHosts(link, seigaHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  // `embed` is the live host's own route, `live.nicovideo.jp/embed/{id}`, so a broadcast already
  // in embed form is read here rather than dropped.
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
