import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVar } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'rtve'

// `irtve.es` is the older spelling of the same broadcaster's asset domain and carries the
// Flash player under the same path.
const rtveHosts = ['rtve.es', 'irtve.es']

type Kind = 'audio' | 'video'

const safeAssetIdRegex = /^\d+$/

// The player is retired, so the band can never refuse a real id and only narrows the mint.
// The asset is {id}_{locale}_{audios|videos}, in the swf query on v2 and the flashvars on 4.x.
// The locale says nothing about the asset, and RTVE's ids start above a million.
const flashAssetRegex = /^(\d{4,12})_[a-z]{2}_(audios|videos)$/

const flashPlayerPathRegex = /^\/swf\/.*\.swf$/i

// The player fills whatever box it gets, and the Flash video carriers state 425 by 239, 16:9.
const playerRatio = '16/9'

// Audio and video are two id spaces with one grammar, and rtve.es/api/{videos|audios}/{id}.json
// needs the kind. img.rtve.es/v/{id}/ answers for a video id only, and no poster route exists for
// audio.
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

  // RTVE's snippet writes the title into name, not title.
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

  const asset = parsed.searchParams.get('assetID') ?? flashVar(element, 'assetID')
  const match = asset?.match(flashAssetRegex)

  if (!match) {
    return
  }

  // The 4.x snippet writes the asset's page link as the object's fallback, named after it.
  const title = element?.closest('object')?.querySelector(':scope > a')?.textContent?.trim()

  return { ...composeEmbed(match[2] === 'audios' ? 'audio' : 'video', match[1]), title }
}

// RTVE's retired Flash player under /swf/, which names its asset as {id}_es_{audios|videos}.
export const rtveFlashEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveFlashResolveEmbed)

export const rtveRenderHint: EmbedRenderHint = {
  provider,
  // Compared as a string: autoplay=1 leaves the player's flag false.
  autoplayParams: { autoplay: 'true' },
}
