import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const typeformHosts = ['typeform.com']

const safeIdRegex = /^[A-Za-z0-9]+$/

const titlePropRegex = /(?:^|,)title=([^,]+)/

const launcherAttributes = ['data-tf-popup', 'data-tf-slider', 'data-tf-popover', 'data-tf-sidetab']

const composeEmbed = (id: string, title?: string): EmbedResolverResult | undefined => {
  if (!safeIdRegex.test(id)) {
    return
  }

  const result: EmbedResolverResult = {
    provider: 'typeform',
    id,
    src: `https://form.typeform.com/to/${id}`,
    url: `https://form.typeform.com/to/${id}`,
  }

  return title ? { ...result, title } : result
}

const readTitle = (element: Element): string | undefined => {
  return attr(element, 'data-tf-iframe-props')?.match(titlePropRegex)?.[1]?.trim() || undefined
}

// Typeform's inline embed is an empty div only the SDK hydrates into an iframe.
export const typeformWidgetEmbedResolver = createMarkupEmbedResolver(
  'div[data-tf-widget], div[data-tf-live], div.typeform-widget[data-url]',
  (element) => {
    if (launcherAttributes.some((name) => element.hasAttribute(name))) {
      return
    }

    const title = readTitle(element)

    return (
      composeEmbed(attr(element, 'data-tf-widget') ?? '', title) ??
      composeEmbed(attr(element, 'data-tf-live') ?? '', title) ??
      typeformResolveEmbed(attr(element, 'data-url') ?? '')
    )
  },
)

export const typeformResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, typeformHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)

  return segments[0] === 'to' && segments[1] ? composeEmbed(segments[1]) : undefined
}

// A Typeform form iframe, on form.typeform.com or a per-account subdomain.
export const typeformIframeEmbedResolver = createUrlEmbedResolver(
  typeformHosts,
  typeformResolveEmbed,
)
