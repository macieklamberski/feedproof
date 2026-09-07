import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Embedly's platform.js turns an `.embedly-card` element into an iframe on the live page. In
// a feed the static form survives. Two shapes share the class, and only the blockquote is
// converted:
//
// - `<blockquote class="embedly-card"><h4><a href>Title</a></h4><p>Description</p></blockquote>`
//   is block-level and carries a description the raw markup renders as a loose paragraph.
// - `<a class="embedly-card" href>Title</a>` is left alone. It already renders as the titled
//   link a placeholder would fall back to, so converting it adds nothing, and replacing an
//   inline anchor with a block placeholder would break the paragraph around it.
//
// The rich card (thumbnail, publisher) only exists in the hydrated iframe, so even the
// blockquote carries only url, title and description.
export const embedlyCiteResolver: CiteResolver = {
  kind: 'cite',
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
