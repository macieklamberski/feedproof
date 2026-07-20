import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, bgImage, find, text } from '../utils/dom.js'

// note.com renders a pasted link as an `external-article` figure. The same
// `embedded-service="external-article"` attribute also marks shopping and crowdfunding
// cards, but those carry different inner classes, so the missing title guard drops them.
// Two note.com quirks: the url is on the inner anchor (there is no `data-src` despite what
// older notes claimed), and the thumbnail is a CSS `background-image` on the image anchor
// rather than an `<img src>`.
export const notecomCiteResolver: CiteResolver = {
  selector: 'figure[embedded-service="external-article"]',
  extract: (element) => {
    return buildCite({
      provider: 'notecom',
      url: attr(find(element, 'a'), 'href'),
      title: text(element, '.external-article-widget-title'),
      description: text(element, '.external-article-widget-description'),
      publisher: text(element, '.external-article-widget-url'),
      thumbnail: bgImage(find(element, '.external-article-widget-image')),
    })
  },
}
