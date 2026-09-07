import { getPathSegments, isAnyOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import {
  audioFileRegex,
  documentFileRegex,
  imageFileRegex,
  parseUrlOnHosts,
  videoFileRegex,
} from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const issuuHosts = ['issuu.com']

// Two id spaces, and neither converts into the other. A config id is a pair of counters
// (`1016421/47623369`) and addresses the reader through the url hash. A publisher and document
// name pair addresses the same reader through the query. Each has its own url, which is what
// makes both resolvable with nothing fetched.
const configIdRegex = /^\d+\/\d+$/
const safeNameRegex = /^[\w.-]+$/

// A document name is a slug and never a filename. The reader shares this url shape with the
// enclosure probe, which offers it every attachment a feed carries, so a `.pdf` or `.mp3` on
// the host would otherwise be minted as a document and take the place of a playable file.
const isFileName = (value: string): boolean => {
  return (
    documentFileRegex.test(value) ||
    audioFileRegex.test(value) ||
    videoFileRegex.test(value) ||
    imageFileRegex.test(value)
  )
}
const pageNumberRegex = /^\d+$/

// `anonymous-embed.html` is gone: it answers 403 with an S3 access-denied body for every request,
// its own documents as well as an invented one, while `embed.html` beside it serves the reader.
// Both take the same query, so moving it across repairs those embeds.
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

  const pageQuery = page && pageNumberRegex.test(page) ? `&p=${page}` : ''

  return {
    provider: 'issuu',
    id: `${publisher}/${documentName}`,
    src: `https://e.issuu.com/embed.html?u=${publisher}&d=${documentName}${pageQuery}`,
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

// Issuu's inline embed is an empty `<div class="issuuembed">` that `e.issuu.com/embed.js`
// hydrates into an iframe at runtime. With no script running there is nothing in the markup at
// all, so the div is dropped as empty and the document goes with it.
//
// The loader is what says how each attribute addresses the reader. It reads `data-configid` into
// the hash of `e.issuu.com/embed.html`, and parses `data-url` into the `u`, `d` and `p` query the
// iframe form already uses. Publishers write the hash form into iframes by hand as well, which is
// the second place it can be read off.
export const issuuWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.issuuembed[data-configid], div.issuuembed[data-url]',
  (element) => {
    return (
      composeConfigEmbed(attr(element, 'data-configid')) ??
      readDocumentUrl(attr(element, 'data-url') ?? '')
    )
  },
)

// The Flash viewer, `static.issuu.com/webembed/…/IssuuReader.swf`, reaches here and is left alone.
// Its `documentId` flashvar is a third id space that neither url form accepts. The older
// `IssuuViewer.swf` snippets carry `username` and `docName` beside it, which is what the document
// composer above mints from, so a repair is writable. It stays unwritten because nothing shows it
// would help: `e.issuu.com/embed.html` answers the same 10,540 bytes for a real pair and an
// invented one (2026-09-06), so no probe tells a document that still serves from one that does not.
export const issuuResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return
  }

  // The publication name is the only thing an Issuu carrier states that neither url form holds,
  // and the current share snippet writes it on the iframe. It is read before the branch below,
  // because a reader-page carrier is the one a publisher pastes with the wrapper around it and
  // so carries the name at least as often as the embed form does.
  const title = attr(element, 'title')

  // A carrier framing the reader page rather than the embed, which is what a publisher pastes
  // from the address bar. It names the document in its path, and the widget div's `data-url`
  // states it the same way.
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
