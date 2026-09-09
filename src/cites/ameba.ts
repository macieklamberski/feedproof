import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Ameba's ogpCard: an anchor of inline-styled spans frozen from the link's Open Graph data.
export const amebaCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.ogpCard_wrap',
  extract: (element) => {
    return buildCite({
      provider: 'ameba',
      url: attr(find(element, 'a.ogpCard_link'), 'href'),
      title: text(element, '.ogpCard_title'),
      description: text(element, '.ogpCard_description'),
      publisher: text(element, '.ogpCard_urlText'),
      // No icon: img.ogpCard_icon is Ameba's generic link glyph, not the linked site's favicon.
      // It is editor_link.svg served from Ameba's own asset host.
      thumbnail: attr(find(element, 'img.ogpCard_image'), 'src'),
    })
  },
}
