import { getPathSegments, isHostOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'flourish'

const flourishHosts = ['flo.uri.sh', 'public.flourish.studio']

const safeResourceRegex = /^[a-z][a-z-]*$/
const safeIdRegex = /^\d+$/

const nonEmbeddableResource = 'template'

const widgetSrcRegex = /^([a-z]+)\/(\d+)(?:\?.*)?$/

const composeEmbed = (resource: string, id: string): EmbedResolverResult | undefined => {
  if (!safeResourceRegex.test(resource) || resource === nonEmbeddableResource) {
    return
  }

  if (!safeIdRegex.test(id)) {
    return
  }

  return {
    provider,
    id: `${resource}/${id}`,
    src: `https://flo.uri.sh/${resource}/${id}/embed`,
    url: `https://public.flourish.studio/${resource}/${id}/`,
  }
}

// Flourish ships a chart as an empty div its SDK script builds into an iframe at runtime.
export const flourishWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.flourish-embed[data-src]',
  (element) => {
    const match = attr(element, 'data-src')?.match(widgetSrcRegex)

    if (!match) {
      return
    }

    const result = composeEmbed(match[1], match[2])
    const thumbnail = attr(element.querySelector('img'), 'src')

    if (result && thumbnail) {
      return { ...result, thumbnail }
    }

    return result
  },
)

// The pasted player iframe, the form that reaches a feed when the publisher skipped the script.
export const flourishResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || !isHostOf(parsed, flourishHosts)) {
    return
  }

  const segments = getPathSegments(parsed)

  return segments[2] === 'embed' ? composeEmbed(segments[0], segments[1]) : undefined
}

export const flourishIframeEmbedResolver = createUrlEmbedResolver(
  flourishHosts,
  flourishResolveEmbed,
)

export const readFlourishHeight = (data: unknown): number | undefined => {
  if (typeof data !== 'string') {
    return
  }

  try {
    const message: unknown = JSON.parse(data)

    if (isPlainObject(message) && message.sender === 'Flourish') {
      return readPixels(message.height)
    }
  } catch {}
}

export const flourishRenderHint: EmbedRenderHint = {
  provider,
  params: { auto: '1' },
  readHeight: readFlourishHeight,
}
