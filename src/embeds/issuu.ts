import { getPathSegments, isAnyOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { composeQuery, isFileName, parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const issuuHosts = ['issuu.com']

// A config id is a pair of counters, `1016421/47623369`, addressing the reader through the url
// hash, and a publisher and document name pair addresses it through the query.
// A name of only dots is refused on purpose: `u=..&d=..` would mint `issuu.com/../docs/..`.
const configIdRegex = /^\d+\/\d+$/
const safeNameRegex = /^(?!\.+$)[\w.-]+$/

const pageNumberRegex = /^\d+$/

// Only `embed.html` is minted: `anonymous-embed.html` answers 403 for every document.
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

// The page number stays out of the id, because it selects a view of one document while the id is
// what addresses the document itself. It stays in the url, which is what selects the page.
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

  const safePage = page && pageNumberRegex.test(page) ? { p: page } : undefined
  const query = composeQuery({ u: publisher, d: documentName, ...safePage })

  return {
    provider: 'issuu',
    id: `${publisher}/${documentName}`,
    src: `https://e.issuu.com/embed.html${query}`,
    url: `https://issuu.com/${publisher}/docs/${documentName}`,
  }
}

// A reader url, `issuu.com/{publisher}/docs/{document}` with an optional page number after it.
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
// The loader reads `data-configid` into the hash of `e.issuu.com/embed.html`, and parses
// `data-url` into the `u`, `d` and `p` query.
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
// The Flash viewer `static.issuu.com/webembed/…/IssuuReader.swf` names its document in a
// `documentId` flashvar, a third id space neither url form accepts.
export const issuuResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return
  }

  // The share snippet writes the publication name on the iframe, which neither url form holds.
  const title = attr(element, 'title')

  if (!isAnyOf(getPathSegments(parsed)[0] ?? '', embedPaths)) {
    const embed = readDocumentUrl(url)

    return embed && { ...embed, title }
  }
  // The two id spaces the carrier can name, in the order the reader states them: a config id
  // pair in the fragment, else the publisher and document names in the query.
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
