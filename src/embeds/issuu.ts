import { getPathSegments, isAnyOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isFileName, parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const issuuHosts = ['issuu.com']

// A name of only dots is refused on purpose: `u=..&d=..` would mint `issuu.com/../docs/..`.
const configIdRegex = /^\d+\/\d+$/
const safeNameRegex = /^(?!\.+$)[\w.-]+$/

const pageNumberRegex = /^\d+$/

const embedPaths = ['embed.html', 'anonymous-embed.html']

const composeConfigEmbed = (configId: string | undefined): EmbedResolverResult | undefined => {
  if (!configId || !configIdRegex.test(configId)) {
    return
  }

  return {
    provider: 'issuu',
    id: configId,
    src: `https://e.issuu.com/embed.html#${configId}`,
  }
}

const composeDocumentEmbed = (
  publisher: string | undefined,
  documentName: string | undefined,
  page?: string,
): EmbedResolverResult | undefined => {
  if (!publisher || !documentName) {
    return
  }

  if (!safeNameRegex.test(publisher) || !safeNameRegex.test(documentName)) {
    return
  }

  const pageQuery = page && pageNumberRegex.test(page) ? `&p=${page}` : ''

  return {
    provider: 'issuu',
    id: `${publisher}/${documentName}`,
    src: `https://e.issuu.com/embed.html?u=${publisher}&d=${documentName}${pageQuery}`,
    url: `https://issuu.com/${publisher}/docs/${documentName}`,
  }
}

const readDocumentUrl = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, issuuHosts)

  if (!parsed) {
    return
  }

  const [publisher, marker, documentName, page] = getPathSegments(parsed)

  if (marker !== 'docs' || !documentName || isFileName(documentName)) {
    return
  }

  return composeDocumentEmbed(publisher, documentName, page)
}

// Issuu ships a document as an empty div only its `embed.js` loader hydrates into the reader.
export const issuuWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.issuuembed[data-configid], div.issuuembed[data-url]',
  (element) => {
    return (
      composeConfigEmbed(attr(element, 'data-configid')) ??
      readDocumentUrl(attr(element, 'data-url') ?? '')
    )
  },
)

// The reader iframe, at `e.issuu.com/embed.html` or the document page pasted from the address bar.
export const issuuResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return
  }

  const title = attr(element, 'title')

  if (!isAnyOf(getPathSegments(parsed)[0] ?? '', embedPaths)) {
    const embed = readDocumentUrl(url)

    return embed && { ...embed, title }
  }
  const embed =
    composeConfigEmbed(parsed.hash.replace('#', '')) ??
    composeDocumentEmbed(
      parsed.searchParams.get('u') ?? undefined,
      parsed.searchParams.get('d') ?? undefined,
      parsed.searchParams.get('p') ?? undefined,
    )

  return embed && { ...embed, title }
}

export const issuuIframeEmbedResolver = createUrlEmbedResolver(issuuHosts, issuuResolveEmbed)
