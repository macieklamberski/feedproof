import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `irtve.es` is the older spelling of the same broadcaster's asset domain and carries the
// Flash player under the same path.
const provider = 'rtve'

const rtveHosts = ['rtve.es', 'irtve.es']

type Kind = 'audio' | 'video'

// The id is the last segment of `/drmn/embed/{audio|video}/`, where nothing but an asset id
// sits, so the length is not what selects one. Checked live 2026-09-07: two real ids answer 200
// with the player, while `directo`, a three-digit id and a fourteen-digit one all answer 404,
// the same as an invented id. Digits are what stays, and they exclude the dot, which keeps an
// RTVE media file playable when the enclosure probe offers it here.
const safeAssetIdRegex = /^\d+$/

// The Flash player names its asset as `{id}_es_{audios|videos}`, in the swf query on the v2
// player and in the flashvars on the 4.x one. The language segment varies with the site's
// locale and says nothing about the asset.
//
// The two bands are records rather than bets and stay for that reason. RTVE retired this player,
// so no snippet naming a new asset or a new locale will ever be written and the population
// cannot grow: a bound on it can never refuse a real id, while dropping it only widens what a
// malformed `assetID` mints. RTVE's asset ids start above a million, so every id from the Flash
// era is seven or eight digits and sits well inside the band. `audios|videos` is a different
// question and stays on its own merits: it carries the kind, which is what decides the player,
// the page and the poster the repair is minted onto.
const flashAssetRegex = /^(\d{4,12})_[a-z]{2}_(audios|videos)$/

const flashPlayerPathRegex = /^\/swf\/.*\.swf$/i

const playerRatio = '16/9'

// The modern player is `rtve.es/drmn/embed/{audio|video}/{id}/`. Checked live 2026-09-06 with a
// browser user agent: nine Flash-era asset ids from the corpus, dated 2008 to 2014, each answer
// 200 with the player and its title, and a fabricated id answers 404. Audio and video are two
// id spaces with one grammar, so the id carries the kind, which `rtve.es/api/{videos|audios}/
// {id}.json` needs to look the asset up. The poster and the short page url are per kind too:
// `img.rtve.es/v/{id}/` and `/v/{id}/` answer for a video id, `/a/{id}/` for an audio id, and
// each 404s for the other kind and for an invented id. No poster route exists for audio.
//
// The player has no shape of its own. It fills whatever box it gets, measured at 500 and 1000
// pixels wide and again in a portrait viewport, so neither a ratio nor a fixed height is
// measurable and the box is the caller's. What the video is, though, is 16:9: the Flash video
// carriers state 425x239 in 42 of 47 feeds, which is 16:9 to within 0.03%.
//
// This said `100/57.6` first, which is not a measurement of anything. It is the arithmetic of
// RTVE's own share snippet, a wrapper padded to 64% of its width holding a frame at 90% of that,
// and 0.64 x 0.90 is 0.576. That is 2.3% taller than 16:9, so it reserved a strip of blank under
// a video the platform's own carriers call 16:9, and it was the one decimal ratio in the tree.
// The ratio stands only where the carrier declares nothing, which is 59 of the 71 iframe feeds in
// the census, since those size the frame through that wrapper. Where a carrier states a box it
// wins. Audio states no size at all and the carrier's bar stands.
const composeEmbed = (kind: Kind, id: string): EmbedResolverResult => {
  const result: EmbedResolverResult = {
    provider,
    id: `${kind}/${id}`,
    src: `https://www.rtve.es/drmn/embed/${kind}/${id}/`,
    url: `https://www.rtve.es/${kind === 'video' ? 'v' : 'a'}/${id}/`,
  }

  if (kind === 'video') {
    result.thumbnail = `https://img.rtve.es/v/${id}/`
    result.ratio = playerRatio
  }

  return result
}

export const rtveResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, rtveHosts)

  if (!parsed) {
    return
  }

  const [drmn, embed, kind, id] = getPathSegments(parsed)

  if (drmn !== 'drmn' || embed !== 'embed' || (kind !== 'audio' && kind !== 'video')) {
    return
  }

  if (!id || !safeAssetIdRegex.test(id)) {
    return
  }

  // RTVE's snippet writes the asset's title into `name` rather than `title`.
  const title = attr(element, 'title') ?? attr(element, 'name')

  return { ...composeEmbed(kind, id), title }
}

export const rtveIframeEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveResolveEmbed)

export const rtveFlashResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const asset =
    parsed.searchParams.get('assetID') ??
    new URLSearchParams(flashVars(element) ?? '').get('assetID')
  const match = asset?.match(flashAssetRegex)

  if (!match) {
    return
  }

  // The 4.x snippet writes the asset's page link as the object's fallback, named after it.
  const title = element?.closest('object')?.querySelector(':scope > a')?.textContent?.trim()

  return { ...composeEmbed(match[2] === 'audios' ? 'audio' : 'video', match[1]), title }
}

export const rtveFlashEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveFlashResolveEmbed)

// Starts playback on the click that loads the player, on both kinds this file mints. The page
// carries `"autoplay":false` escaped inside its own payload and the parameter flips it, compared
// as a string. Verified live 2026-09-08 on `/drmn/embed/video/2474214/` and
// `/drmn/embed/audio/1925451/`: `?autoplay=true` reads `"autoplay":true` on both, while
// `?autoplay=1` and an unrelated `?foo=bar` each leave it false.
export const rtveRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
