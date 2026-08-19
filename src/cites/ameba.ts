import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Ameba (ameblo.jp) renders a pasted link as an "ogpCard": an anchor built from the linked
// page's Open Graph data, with each field in its own heavily inline-styled span. The `og`
// in the class names refers to Open Graph, but the markup is Ameba's own: the card is frozen
// into the post at publish time, not fetched from the linked page.
//
// `img.ogpCard_icon` is a generic grey link glyph from Ameba's own asset host
// (editor_link.svg), not the linked site's favicon, so it is deliberately not mapped.
export const amebaCiteResolver: CiteResolver = {
  selector: '.ogpCard_wrap',
  extract: (element) => {
    return buildCite({
      provider: 'ameba',
      url: attr(find(element, 'a.ogpCard_link'), 'href'),
      title: text(element, '.ogpCard_title'),
      description: text(element, '.ogpCard_description'),
      publisher: text(element, '.ogpCard_urlText'),
      thumbnail: attr(find(element, 'img.ogpCard_image'), 'src'),
    })
  },
}
