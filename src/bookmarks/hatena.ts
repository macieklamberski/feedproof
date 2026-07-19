import type { BookmarkResolver } from '../types.js'

// Hatena Blog renders a pasted link as an iframe pointing at its card renderer, followed by
// a `<cite>` holding the real link. Both sit inside one paragraph, and the paragraph is what
// this matches: matching the iframe alone would convert the card but leave the citation
// behind as a stray domain link next to it.
//
// The two elements carry different halves of the card. The iframe's `title` attribute holds
// the page title and its `src` carries the target as a `url` query parameter; the citation
// holds the same target unencoded, plus the domain as its text.
export const hatenaBookmarkResolver: BookmarkResolver = {
  selector: 'p:has(> iframe.embed-card)',
  extract: (element) => {
    const iframe = element.querySelector('iframe.embed-card')
    const citationLink = element.querySelector('cite.hatena-citation a')

    // Prefer the citation's href: it is the plain target, so it needs no decoding.
    const embedUrl = iframe?.getAttribute('src')
    const embeddedUrl = embedUrl
      ? new URL(embedUrl, 'https://example.invalid').searchParams.get('url')
      : null
    const url = citationLink?.getAttribute('href') ?? embeddedUrl ?? undefined
    const title = iframe?.getAttribute('title')?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'hatena',
      url,
      title,
      publisher: citationLink?.textContent ?? undefined,
    }
  },
}
