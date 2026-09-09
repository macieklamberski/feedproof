import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, flashVar, keepIfMatches, parseRatio } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The embed routes are the site's own. `scribdassets.com` served the Flash player and serves the
// document images beside it, `img/document/{id}/…` among them, so only the Flash resolver takes
// it: read as an embed those images mint a player over a picture the feed attached.
const scribdHosts = ['scribd.com']
// scribdassets.com serves img/document/{id}/ images too, which would read here as documents.
const scribdFlashHosts = [...scribdHosts, 'scribdassets.com']

const safeDocumentIdRegex = /^\d+$/

const flashPlayerPathRegex = /\/scribdviewer\.swf$/i

// The snippet states `height="500"` whatever the document's real shape is, which is why
// third-party wrappers re-wrap it in a container with a computed padding. The iframe carries
// the truth beside the wrong number, as a bare decimal width over height.
const aspectRatioAttribute = 'data-aspect-ratio'

// The embeds route answers 200 with an identical body for any id, rendering "Document deleted by
// owner" for a Flash-era id and "Document Not Found" for an invented one.
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

// The modern player, `scribd.com/embeds/{id}/content`. `/doc/{id}` is the pre-2018 spelling of
// the same document and its embed lived at `/embeds/{id}` with no `/content` suffix. Both
// address the id space this composes from.
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

  // The ratio describes the document and the declared height is a constant, so where both are
  // present the ratio wins. Where the snippet states no ratio, stating none here hands the
  // question back to the factory, and the declared size is all there is.
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

  const document = parsed.searchParams.get('document_id') ?? flashVar(element, 'document_id')

  return document && safeDocumentIdRegex.test(document) ? composeEmbed(document) : undefined
}

// Scribd's Flash viewer, scribdviewer.swf, dead since 2020 and naming its document in document_id.
export const scribdFlashEmbedResolver = createUrlEmbedResolver(
  scribdFlashHosts,
  scribdFlashResolveEmbed,
)
