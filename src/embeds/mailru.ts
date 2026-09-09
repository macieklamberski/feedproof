import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVar } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mailru'

// `my.mail.ru` serves the player, `api.video.mail.ru` was the host of the older embed and no
// longer resolves, and `img.mail.ru` served the Flash player.
const mailruHosts = ['my.mail.ru', 'api.video.mail.ru', 'img.mail.ru']

// The share dialog writes a negative id for some accounts, so the sign stays.
const numericPathRegex = /^\/video\/embed\/(-?\d+)\/?$/
// api.video.mail.ru/videos/embed/{type}/{user}/{album}/{n}.html is dead, and the same path on
// videoapi.my.mail.ru 301s to my.mail.ru/{type}/{user}/video/embed/{album}/{n}.
const legacyPathRegex = /^\/videos\/embed\/(.+)\.html$/
const modernPathRegex = /^\/([a-z]+)\/([\w.-]+)\/video\/embed\/([\w.-]+)\/(\d+)\/?$/
// {type}/{user}/{album}/{counter}, with no segment made of dots alone: movieSrc arrives decoded,
// so a dot segment would climb out of the minted path.
const subjectRegex = /^([a-z]+)\/((?!\.+\/)[\w.-]+)\/((?!\.+\/)[\w.-]+)\/(\d+)$/
const flashPlayerPathRegex = /^\/r\/video2\/\w+\.swf$/

const composeNumeric = (videoId: string): EmbedResolverResult => {
  return {
    provider,
    id: videoId,
    src: `https://my.mail.ru/video/embed/${videoId}`,
  }
}

const composeSubject = (subject: string): EmbedResolverResult | undefined => {
  const match = subject.match(subjectRegex)

  if (!match) {
    return
  }

  const [, type, user, album, counter] = match

  return {
    provider,
    // my.mail.ru/+/video/meta/{type}/{user}/{n} answers with the title, the poster and the duration
    // for a real video and 404 for an invented one.
    id: `${type}/${user}/${album}/${counter}`,
    src: `https://my.mail.ru/${type}/${user}/video/embed/${album}/${counter}`,
    url: `https://my.mail.ru/${type}/${user}/video/${album}/${counter}.html`,
    author: user,
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

// A Mail.ru video: the my.mail.ru iframe, the dead api.video.mail.ru embed or the Flash player.
export const mailruEmbedResolver = createUrlEmbedResolver(mailruHosts, mailruResolveEmbed)

export const mailruRenderHint: EmbedRenderHint = {
  provider,
  // The player reads autoplay off its flashVars for truth, and refuses the start on a mobile user
  // agent whatever the value says.
  autoplayParams: { autoplay: '1' },
}
