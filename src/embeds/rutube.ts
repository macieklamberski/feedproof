import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts, pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Rutube video id is a uuid with the dashes stripped, and the older numeric ids the same routes
// carried are taken too, because the player still plays them. Checked 2026-09-07: the player's own
// options endpoint answers 200 with the title and a stream for the legacy `16879846` and for the
// uuid `a104813a026655f245ce34e3ac10ebf5` that `api/video/16879846/` names as the same video,
// while an invented id answers `default_does_not_exists_video`. So the length is not checked: it
// would refuse a live legacy video, and a wrong id fails the same whether it is minted or passed
// through. An id also has to carry a digit, which is what separates it from a word spelled in hex
// letters: `play/embed/feed` and `play/embed/added` would otherwise mint a placeholder. Every real
// id has one, the legacy form being all digits and a 32-character uuid of none being a one in
// ten-trillion shape.
const safeVideoIdRegex = /^(?=[0-9a-f]*\d)[0-9a-f]+$/

const rutubeHosts = ['rutube.ru']

// `/video/embed/{id}` and `/embed/{id}` both 301 to `/play/embed/{id}`, and the playlist route
// `/pl/?pl_video={id}` does the same, so all four spellings mint the one the player serves.
// The Flash player on `video.rutube.ru/{id}` is not one of them, and the carrier is left alone
// because the videos are gone rather than because the id cannot be read: it is the same 32
// character space, so minting from it would work. Every `video.rutube.ru` id in a 1 in 32 sample
// of the corpus was probed on 2026-09-07, 83 distinct ids across 328 occurrences, and 82 answer
// 404 on the API. The one that lives is `01857e300b4af7ea778e473eeb77dd79`, so a resolver here
// would recover one feed in eighty-three and give the other eighty-two the player's own
// "incorrect link" screen where they now get nothing.
const embedPathRegex = /^\/(?:play\/embed|video\/embed|embed)\/([^/]+)\/?$/
const playlistPathRegex = /^\/pl\/?$/

// The parameters that change what plays: the offsets playback starts and stops at, and the access
// key a private video will not play without (rutube.ru/info/embed, checked 2026-09-07). The skin
// colour, the quality preference and autoplay go with the rest of the publisher's query, as do
// the playlist route's own parameters, which name the playlist and not the video.
const rutubeEmbedParams = ['p', 't', 'stopTime']

// `api/video/{id}/` and `api/oembed/?url=` both answer key-free with the title, the author, the
// duration and a poster, 200 for a real id and 404 for an invented one (checked 2026-09-06), so
// the id is a self-sufficient enrichment key. The poster file is named by a hash the id does not
// yield, so it stays with enrichment.
//
// The player fills its box, and Rutube's own snippet and oEmbed size it 720x405, which 489 of the
// 1,491 iframes in the 396 census feeds that carry one repeat exactly; the ratio stands in only
// where a carrier states nothing, since vertical clips are embedded at their own shape.
const composeEmbed = (videoId: string, link: string): EmbedResolverResult => {
  return {
    provider: 'rutube',
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

export const rutubeEmbedResolver = createUrlEmbedResolver(rutubeHosts, rutubeResolveEmbed)

// Starts playback on the click that loads the player. The value is compared as a string in the
// player's `_prepareParams()`, which sets its config flag only for exactly `true` or `false` and
// leaves it untouched for anything else, and `handleAutoplay` is what acts on the flag. A start
// the browser refuses is not a dead end here: the player retries muted and draws an unmute button
// over the video, which is the state a reader will see when the click did not carry far enough.
// The player also takes `{"type":"player:play"}` posted in after its own `player:ready`, which is
// where to go if the parameter ever stops working. Checked live 2026-09-07: the frame loads from
// `https://rutube.ru` and posts `player:ready`, `player:init` and `player:controlsVisibilityChanged`.
export const rutubeRenderHint: EmbedRenderHint = {
  provider: 'rutube',
  autoplayParams: { autoplay: 'true' },
}
