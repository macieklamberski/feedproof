import { parseUrl } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'

const cardHost = 'hatenablog-parts.com'

// The iframe's class is not dependable: embed-card is the common spelling, and the rest ship
// hatenablogcard, wp-embedded-content, a theme's own class, or nothing at all.
const cardIframeSelector = [
  'iframe.embed-card',
  'iframe.hatenablogcard',
  `iframe[src*="${cardHost}/embed"]`,
].join(', ')

// Matching the iframe alone leaves the <cite> behind as a stray domain link.
const cardParagraphSelector = cardIframeSelector
  .split(', ')
  .map((selector) => `p:has(> ${selector})`)
  .join(', ')

// A host list misses this: a blog on a custom domain serves its own card from that domain.
// The self-served card is at {blog}.hatenablog.com/embed/{entry}, and the citation beside it
// names the same host.
const isSelfHosted = (source: string, citationHref: string | undefined): boolean => {
  const citation = citationHref ? parseUrl(citationHref, placeholderBaseUrl) : undefined

  return citation !== undefined && parseUrl(source, placeholderBaseUrl)?.host === citation.host
}

// Hatena Blog's link card: an iframe at its card renderer, with a <cite> holding the real link.
export const hatenaCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: cardParagraphSelector,
  extract: (element) => {
    const iframe = find(element, cardIframeSelector)
    const source = attr(iframe, 'src')

    if (!source) {
      return
    }

    const citationLink = find(element, 'cite.hatena-citation a')
    const citationHref = attr(citationLink, 'href')
    const cardUrl = parseUrlOnHosts(source, cardHost)

    // A foreign player carrying the class would become a cite and be deleted with its paragraph.
    if (!cardUrl && !isSelfHosted(source, citationHref)) {
      return
    }

    return buildCite({
      provider: 'hatena',
      // The citation's href comes first: it is the plain target, so it needs no decoding.
      url: citationHref ?? cardUrl?.searchParams.get('url'),
      title: attr(iframe, 'title'),
      publisher: text(citationLink),
    })
  },
}
