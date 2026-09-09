import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mailru'

const mailruHosts = ['my.mail.ru', 'api.video.mail.ru', 'img.mail.ru']

const numericPathRegex = /^\/video\/embed\/(-?\d+)\/?$/
const legacyPathRegex = /^\/videos\/embed\/(.+)\.html$/
const modernPathRegex = /^\/([a-z]+)\/([\w.-]+)\/video\/embed\/([\w.-]+)\/(\d+)\/?$/
// {type}/{user}/{album}/{counter}, with no segment made of dots alone.
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

    const movieSrc =
      parsed.searchParams.get('movieSrc') ?? new URLSearchParams(flashVars(element)).get('movieSrc')

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
  autoplayParams: { autoplay: '1' },
}
