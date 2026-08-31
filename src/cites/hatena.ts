import { parseUrl } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Hatena Blog renders a pasted link as an iframe pointing at its card renderer, followed by
// a `<cite>` holding the real link. Both sit inside one paragraph, and the paragraph is what
// this matches: matching the iframe alone would convert the card but leave the citation behind
// as a stray domain link, and hand the card to the generic embed path, which emits a placeholder
// pointing at the card renderer rather than a viewable embed.
//
// Replacing the whole paragraph drops any prose the author wrote beside the card. That case is
// rare, and kept anyway.
//
// The card renderer's host is matched beside the class because the class is not dependable:
// `embed-card` is the common spelling, and the rest ship `hatenablogcard`,
// `wp-embedded-content`, a theme's own class, or nothing at all.
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

    const embedUrl = attr(iframe, 'src')
    const embeddedUrl = parseUrl(embedUrl ?? '', 'https://example.invalid')?.searchParams.get('url')

    return buildCite({
      provider: 'hatena',
      // The citation's href comes first: it is the plain target, so it needs no decoding.
      url: attr(citationLink, 'href') ?? embeddedUrl,
      title: attr(iframe, 'title'),
      publisher: text(citationLink),
    })
  },
}
