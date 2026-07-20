import type { CiteResolver } from '../types.js'
import { attr, find, text, textNode } from '../utils/dom.js'

// NodeBB's bundled link-preview plugin (on by default since v3.1) rewrites a pasted link
// into a Bootstrap card that it stores in the post HTML, so it survives into the feed body.
// The wrapper shares the generic `card` class, so this keys on the co-occurring
// `link-preview` class to avoid matching unrelated Bootstrap cards. The three anchors (image,
// title, footer) all carry the same target url. The footer holds the site name as a bare
// text node next to a `(domain)` span, so `textNode` gets the name without the domain.
export const nodebbCiteResolver: CiteResolver = {
  selector: '.link-preview',
  extract: (element) => {
    const url = attr(find(element, '.card-title a'), 'href') ?? attr(find(element, 'a'), 'href')
    const title = text(element, '.card-title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'nodebb',
      url,
      title,
      description: text(element, '.card-text'),
      publisher: textNode(find(element, '.card-footer p')),
      thumbnail: attr(find(element, '.card-img-top'), 'src'),
    }
  },
}
