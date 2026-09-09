import { getPathSegments, toMap } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'wistia'

export const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

const jsonpSuffixRegex = /\.jsonp$/

const wistiaHosts = ['wistia.net', 'wistia.com']

// Both spellings ship: channel on the player host and channels on the account host.
const playerRoutes = toMap({
  iframe: 'iframe',
  medias: 'iframe',
  channel: 'channel',
  channels: 'channel',
  playlists: 'playlists',
})

export const composeEmbedUrl = (route: string, mediaId: string): string => {
  return `https://fast.wistia.net/embed/${route}/${mediaId}`
}

export const extractWistiaEmbed = (
  link: string,
): { route: string; id: string; page?: string } | undefined => {
  const segments = getPathSegments(link)
  const start = segments[0] === 'embed' ? 1 : 0
  const named = segments[start] ?? ''
  const route = playerRoutes.get(named)
  const id = keepIfMatches(segments[start + 1]?.replace(jsonpSuffixRegex, ''), safeMediaIdRegex)

  if (!route || !id) {
    return
  }

  const host = segments[0] === 'medias' ? parseUrlOnHosts(link, wistiaHosts)?.hostname : undefined

  return { route, id, page: host ? `https://${host}/medias/${id}` : undefined }
}

export const readSrcMediaId = (src: string | undefined): string | undefined => {
  const url = parseUrlOnHosts(src, wistiaHosts)

  return url ? extractWistiaEmbed(url.href)?.id : undefined
}

export const wistiaResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const embed = extractWistiaEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider,
    id: embed.route === 'iframe' ? embed.id : `${embed.route}/${embed.id}`,
    src: composeEmbedUrl(embed.route, embed.id),
    url: embed.page,
    title: element ? attr(element, 'title') : undefined,
  }
}

// A Wistia media, channel or playlist player iframe, or a frame of the login-gated channel page.
export const wistiaEmbedResolver = createUrlEmbedResolver(wistiaHosts, wistiaResolveEmbed)

export const wistiaRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoPlay: 'true' },
}
