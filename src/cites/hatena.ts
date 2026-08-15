import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Hatena Blog renders a pasted link as an iframe pointing at its card renderer, followed by
// a `<cite>` holding the real link. Both sit inside one paragraph, and the paragraph is what
// this matches: matching the iframe alone would convert the card but leave the citation
// behind as a stray domain link next to it.
//
// Replacing the whole paragraph drops any prose the author wrote beside the card, measured
// at 1.22% of corpus occurrences (19 of 1,558, across 7 feeds). Kept anyway: matching the
// iframe alone leaves those cards to the generic embed path, which emits a placeholder
// pointing at the card renderer rather than a viewable embed, plus a stray `<cite>`.
//
// The two elements carry different halves of the card. The iframe's `title` attribute holds
// the page title and its `src` carries the target as a `url` query parameter; the citation
// holds the same target unencoded, plus the domain as its text.
//
// The card renderer's host is matched beside the class because the class is not dependable:
// of 756 corpus feeds framing that host, 684 spell `embed-card` and the remaining 72 spell
// `hatenablogcard`, `wp-embedded-content`, a theme's own class, or nothing at all. Those were
// reaching the generic embed path, which is the outcome this resolver exists to prevent: a
// placeholder pointing at the card renderer, with the citation orphaned beside it.
const cardIframeSelector = [
  'iframe.embed-card',
  'iframe.hatenablogcard',
  'iframe[src*="hatenablog-parts.com/embed"]',
].join(', ')

const cardParagraphSelector = cardIframeSelector
  .split(', ')
  .map((selector) => `p:has(> ${selector})`)
  .join(', ')

export const hatenaCiteResolver: CiteResolver = {
  selector: cardParagraphSelector,
  extract: (element) => {
    const iframe = find(element, cardIframeSelector)
    const citationLink = find(element, 'cite.hatena-citation a')

    // Prefer the citation's href: it is the plain target, so it needs no decoding.
    const embedUrl = attr(iframe, 'src')
    const embeddedUrl = embedUrl
      ? new URL(embedUrl, 'https://example.invalid').searchParams.get('url')
      : null

    return buildCite({
      provider: 'hatena',
      url: attr(citationLink, 'href') ?? embeddedUrl,
      title: attr(iframe, 'title'),
      publisher: text(citationLink),
    })
  },
}
