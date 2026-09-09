import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Embedly's blockquote card: a title link and a description that only platform.js hydrates.
// The thumbnail and publisher exist only in the hydrated iframe.
export const embedlyCiteResolver: CiteResolver = {
  kind: 'cite',
  // The bare a.embedly-card stays: it already renders as the titled link a placeholder would fall
  // back to, and replacing an inline anchor with a block breaks its paragraph.
  selector: 'blockquote.embedly-card',
  extract: (element) => {
    return buildCite({
      provider: 'embedly',
      url: attr(find(element, 'a'), 'href'),
      title: text(element, 'h4'),
      description: text(element, 'p'),
    })
  },
}
