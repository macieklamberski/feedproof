import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, parseRatioDimensions } from '../utils/dom.js'
import { createUrlEmbedResolver, withDeclaredSize } from '../utils/widgets.js'

const scribdHosts = ['scribd.com', 'scribdassets.com']

const safeDocumentIdRegex = /^\d{4,18}$/

const flashPlayerPathRegex = /\/scribdviewer\.swf$/i

// The snippet states `height="500"` whatever the document's real shape is, which is why
// third-party wrappers re-wrap it in a container with a computed padding. The iframe carries
// the truth beside the wrong number, as a bare decimal width over height.
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

  return document && safeDocumentIdRegex.test(document) ? document : undefined
}

// The modern player, `scribd.com/embeds/{id}/content`. `/doc/{id}` is the pre-2018 spelling of
// the same document and its embed lived at `/embeds/{id}` with no `/content` suffix; both
// address the id space this composes from.
export const scribdResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || (!isHostOf(parsed, scribdHosts) && !isSubdomainOf(parsed, scribdHosts))) {
    return
  }

  const document = readDocumentId(parsed)

  if (!document) {
    return
  }

  const result = composeEmbed(document)
  const dimensions = parseRatioDimensions(attr(element, aspectRatioAttribute) ?? '')

  // The ratio describes the document and the declared height is a constant, so where both are
  // present the ratio wins. Where the snippet states no ratio the declared size is all there
  // is, and it is read here rather than by the factory because that would overwrite the ratio.
  return dimensions ? { ...result, ...dimensions } : withDeclaredSize(element, result)
}

export const scribdIframeEmbedResolver = createUrlEmbedResolver(scribdHosts, scribdResolveEmbed, {
  declaredSize: false,
})

// Flash died in 2020, so these have rendered nothing since and the placeholder the generic
// carrier builds points at the dead `.swf` itself. The repair is exact: the swf query names the
// document in `document_id`, and that is the same id space the modern route reads. Scribd
// distinguishes the two cases itself, answering a Flash-era id with "Document deleted by owner"
// and an invented one with "Document Not Found" (checked in a browser 2026-08-13), which is
// what proves the spaces are shared. A status code cannot: the route answers 200 with an
// identical body either way.
export const scribdFlashResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const document = parsed.searchParams.get('document_id')

  return document && safeDocumentIdRegex.test(document) ? composeEmbed(document) : undefined
}

export const scribdFlashEmbedResolver = createUrlEmbedResolver(
  scribdHosts,
  scribdFlashResolveEmbed,
  { declaredSize: false },
)
