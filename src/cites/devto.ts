import type { CiteResolver } from '../types.js'
import { attr, find, text, textNode } from '../utils/dom.js'

// dev.to (Forem) turns a pasted link into an embed card. Forem compiles its liquid tags to
// HTML when the article is saved, so the card is already in the stored body by the time the
// feed renders, and the feed sanitizer's allowlist keeps `div`, `class` and `id` intact.
export const devtoCiteResolver: CiteResolver = {
  selector: '.c-embed',
  extract: (element) => {
    const body = find(element, '.c-embed__body')
    const url = attr(find(body, 'h2 a'), 'href') ?? attr(find(element, '.c-embed__cover a'), 'href')
    const title = text(body, 'h2')

    if (!url || !title) {
      return
    }

    const favicon = find(element, 'img.c-embed__favicon')

    return {
      provider: 'devto',
      url,
      title,
      description: text(body, 'p'),
      // The publisher is a bare text node beside the favicon image rather than an element
      // of its own, so it is read from the favicon's parent, text nodes only.
      publisher: textNode(favicon?.parentElement),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.c-embed__cover img'), 'src'),
    }
  },
}
