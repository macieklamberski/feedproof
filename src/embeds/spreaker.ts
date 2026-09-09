import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'spreaker'

const safeIdRegex = /^\d+$/

const spreakerHosts = ['spreaker.com']

const embedKinds = { episode_id: 'episode', show_id: 'show' } as const

const playerHeight = 200

export const extractSpreakerEmbed = (
  link: string,
): { kind: string; param: string; id: string } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || !getPathSegments(parsed).includes('player')) {
    return
  }

  for (const [param, kind] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { kind, param, id }
    }
  }
}

// Spreaker's player iframe ships no height attribute, so a reader reserves nothing for it.
export const spreakerResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const embed = extractSpreakerEmbed(url)

  if (!embed) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider,
    id: `${embed.kind}/${embed.id}`,
    src: `https://widget.spreaker.com/player?${embed.param}=${embed.id}`,
    url: `https://www.spreaker.com/${embed.kind}/${embed.id}`,
    height: playerHeight,
    ...trimObject({ title }, Boolean),
  }
}

export const spreakerIframeEmbedResolver = createUrlEmbedResolver(
  spreakerHosts,
  spreakerResolveEmbed,
)

// Spreaker's anchor snippet, which only a widgets.js loader swaps for the player at runtime.
export const spreakerAnchorEmbedResolver = createMarkupEmbedResolver(
  'a.spreaker-player[data-resource]',
  (element) => {
    const resource = attr(element, 'data-resource')
    const result = resource
      ? spreakerResolveEmbed(`https://widget.spreaker.com/player?${resource}`)
      : undefined

    if (!result) {
      return
    }

    const stated = parsePixelSize(attr(element, 'data-height'))
    const title = attr(element, 'data-title')

    return {
      ...result,
      ...trimObject({ height: stated, title }, Boolean),
    }
  },
)

export const spreakerRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
