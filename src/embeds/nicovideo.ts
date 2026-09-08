import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
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

// Three of Niconico's sites share the video site's domain, its route words and its id grammar, so
// their ids pass the video id test on the two-letter prefix and the digits alone.
//
// Illustration and manga write `thumb/{kind}{digits}`: `ext.seiga.nicovideo.jp/thumb/im4572423`
// and `ext.manga.nicovideo.jp/thumb/mg316785`. Manga has its own host and the seiga spelling of a
// chapter 301s onto it, so both are named. Checked 2026-09-07: each card answers 200 with the
// work's title and 404 for an invented id, while `embed.nicovideo.jp/watch/{id}` answers 500 for
// either, so reading one as a video would swap a card that renders for a player url that does not.
//
// News writes the `watch` word itself, `news.nicovideo.jp/watch/nw15391705`, and `nw` is two
// letters like every video kind. The mint is dead: `embed.nicovideo.jp/watch/nw15391705` answers
// 500 at 62,848 bytes against 62,849 for a fabricated video id and 200 at 128,065 for a real one,
// so a news article fails exactly as an invented id does, and the page url answers 400. The news
// host 403s every user agent, so whether its own card renders is unmeasured, and no feed carrying
// one has been seen; the refusal rests on the shape reaching the mint and the mint being dead.
const nonVideoHosts = ['seiga.nicovideo.jp', 'manga.nicovideo.jp', 'news.nicovideo.jp']

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

  if (!parsed || parseUrlOnHosts(link, nonVideoHosts)) {
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
    const parsed = parseUrl(source, placeholderBaseUrl)
    const width = parsePixelSize(parsed?.searchParams.get('w'))
    const height = parsePixelSize(parsed?.searchParams.get('h'))

    if (!width || !height) {
      return result
    }

    return { ...result, width, height }
  },
)
