import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'rtve'

const rtveHosts = ['rtve.es', 'irtve.es']

type Kind = 'audio' | 'video'

const safeAssetIdRegex = /^\d+$/

const flashAssetRegex = /^(\d{4,12})_[a-z]{2}_(audios|videos)$/

const flashPlayerPathRegex = /^\/swf\/.*\.swf$/i

const playerRatio = '16/9'

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

  const title = attr(element, 'title') ?? attr(element, 'name')

  return { ...composeEmbed(kind, id), title }
}

// RTVE's player iframe, rtve.es/drmn/embed/{audio|video}/{id}/.
export const rtveIframeEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveResolveEmbed)

export const rtveFlashResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

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

  const title = element?.closest('object')?.querySelector(':scope > a')?.textContent?.trim()

  return { ...composeEmbed(match[2] === 'audios' ? 'audio' : 'video', match[1]), title }
}

// RTVE's retired Flash player under /swf/, which names its asset as {id}_es_{audios|videos}.
export const rtveFlashEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveFlashResolveEmbed)

export const rtveRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
