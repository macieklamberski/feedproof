import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const scribdHosts = ['scribd.com']
const scribdFlashHosts = [...scribdHosts, 'scribdassets.com']

const safeDocumentIdRegex = /^\d+$/

const flashPlayerPathRegex = /\/scribdviewer\.swf$/i

const aspectRatioAttribute = 'data-aspect-ratio'

const composeEmbed = (document: string): EmbedResolverResult => {
  return {
    provider: 'scribd',
    id: document,
    src: `https://www.scribd.com/embeds/${document}/content`,
    url: `https://www.scribd.com/document/${document}`,
  }
}

const readDocumentId = (parsed: URL): string | undefined => {
  const segments = getPathSegments(parsed)
  const marker = segments.findIndex((segment) => {
    return segment === 'embeds' || segment === 'document' || segment === 'doc'
  })
  const document = marker < 0 ? undefined : segments[marker + 1]

  return keepIfMatches(document, safeDocumentIdRegex)
}

export const scribdResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, scribdHosts)

  if (!parsed) {
    return
  }

  const document = readDocumentId(parsed)

  if (!document) {
    return
  }

  const title = attr(element, 'title')
  const result = { ...composeEmbed(document), title }
  const ratio = parseRatio(attr(element, aspectRatioAttribute) ?? '')

  return ratio ? { ...result, ratio } : result
}

// Scribd's player iframe, /embeds/{id}/content, declared 500 tall whatever the document's shape.
export const scribdIframeEmbedResolver = createUrlEmbedResolver(scribdHosts, scribdResolveEmbed, {
  preferResolverSize: true,
})

export const scribdFlashResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const document =
    parsed.searchParams.get('document_id') ??
    new URLSearchParams(flashVars(element) ?? '').get('document_id')

  return document && safeDocumentIdRegex.test(document) ? composeEmbed(document) : undefined
}

// Scribd's Flash viewer, scribdviewer.swf, dead since 2020 and naming its document in document_id.
export const scribdFlashEmbedResolver = createUrlEmbedResolver(
  scribdFlashHosts,
  scribdFlashResolveEmbed,
)
