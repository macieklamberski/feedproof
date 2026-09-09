import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVar } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mailru'

// `my.mail.ru` serves the player, `api.video.mail.ru` was the host of the older embed and no
// longer resolves, and `img.mail.ru` served the Flash player.
const mailruHosts = ['my.mail.ru', 'api.video.mail.ru', 'img.mail.ru']

// A video is addressed two ways. The share dialog writes a numeric id, negative for some
// accounts, `/video/embed/253943806846567285`. The older embed and the Flash player name the
// same video by its place instead: an account type, the account, an album and a counter,
// `mail/shels_1991/20/885`, which is also how the watch page is spelled. `movieSrc` comes off
// the query or the flashvars decoded, so a segment of dots alone in it would climb out of the
// minted path and is refused; the path routes cannot carry one, `URL` folds it first.
const numericPathRegex = /^\/video\/embed\/(-?\d+)\/?$/
const legacyPathRegex = /^\/videos\/embed\/(.+)\.html$/
const modernPathRegex = /^\/([a-z]+)\/([\w.-]+)\/video\/embed\/([\w.-]+)\/(\d+)\/?$/
const subjectRegex = /^([a-z]+)\/((?!\.+\/)[\w.-]+)\/((?!\.+\/)[\w.-]+)\/(\d+)$/
const flashPlayerPathRegex = /^\/r\/video2\/\w+\.swf$/

const composeNumeric = (videoId: string): EmbedResolverResult => {
  return {
    provider,
    id: videoId,
    src: `https://my.mail.ru/video/embed/${videoId}`,
  }
}

// `api.video.mail.ru/videos/embed/{type}/{user}/{album}/{n}.html` is dead, and the same path on
// `videoapi.my.mail.ru` 301s to `my.mail.ru/{type}/{user}/video/embed/{album}/{n}`, which is
// what is minted here (checked 2026-09-06: a 2011 `corp/lady/86/753` answers 200 there). The
// Flash player names the video the same way in `movieSrc`, on its query or in its flashvars.
// `my.mail.ru/+/video/meta/{type}/{user}/{n}` answers with the title, the poster and the
// duration for a real video and 404 for an invented one, so the composite id addresses it.
const composeSubject = (subject: string): EmbedResolverResult | undefined => {
  const match = subject.match(subjectRegex)

  if (!match) {
    return
  }

  const [, type, user, album, counter] = match

  return {
    provider,
    id: `${type}/${user}/${album}/${counter}`,
    src: `https://my.mail.ru/${type}/${user}/video/embed/${album}/${counter}`,
    url: `https://my.mail.ru/${type}/${user}/video/${album}/${counter}.html`,
  }
}

export const mailruResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, mailruHosts)

  if (!parsed) {
    return
  }

  if (parsed.hostname === 'img.mail.ru') {
    if (!flashPlayerPathRegex.test(parsed.pathname)) {
      return
    }

    const movieSrc = parsed.searchParams.get('movieSrc') ?? flashVar(element, 'movieSrc')

    return movieSrc ? composeSubject(movieSrc) : undefined
  }

  const videoId = parsed.pathname.match(numericPathRegex)?.[1]

  if (videoId) {
    return composeNumeric(videoId)
  }

  const legacySubject = parsed.pathname.match(legacyPathRegex)?.[1]

  if (legacySubject) {
    return composeSubject(legacySubject)
  }

  const modern = parsed.pathname.match(modernPathRegex)

  return modern ? composeSubject(modern.slice(1).join('/')) : undefined
}

export const mailruEmbedResolver = createUrlEmbedResolver(mailruHosts, mailruResolveEmbed)

// Starts playback on the click that loads the player. The parameter lands in the page's
// server-rendered `flashVars` block, which the player reads through
// `getParam(a) { return this.options.flashVars[a] }` and hands to
// `playVideo(a) { void 0 === a && (a = !0), a = a && !isMobile(), this.setOption('autoPlay', a) }`.
// That is a truthiness read rather than a comparison, so the value is `1` because it is the one
// Mail.ru's own player writes when it navigates the frame on to the next video,
// `?backscreen=&autoplay=1&currentReferrer=`. Verified live 2026-09-08 on both spellings this
// file mints: the bare page carries `"autoplay":0`, a number and so falsy, `?autoplay=1` makes it
// `"autoplay":"1"`, and an unrelated `?foo=bar` leaves it 0. The player refuses the start on a
// mobile user agent whatever the value says.
//
// `video/embed/yandex-api` also plays on the bare string `play` posted into the frame, with no
// origin check on its listener, and posts `{event:'inited'}` out. That is where to go if the
// parameter ever stops working; sending both would be redundant.
export const mailruRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
