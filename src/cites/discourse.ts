import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// Discourse forums expand a pasted link into a "onebox" card. The engine that built the
// card varies (a generic one covers 979 of the 1,118 corpus feeds, the rest are per-site
// engines like github or wikipedia), and each engine renders its own body markup, so this
// keys on the wrapper and the fields the generic shape shares rather than on the engine
// subclass. The canonical URL sits on the wrapper, so no inner anchor is needed.
export const discourseCiteResolver: CiteResolver = {
  selector: 'aside.onebox[data-onebox-src]',
  extract: (element) => {
    const url = attr(element, 'data-onebox-src')
    const body = find(element, '.onebox-body')
    // Engines differ on the heading level they use for the title.
    const title = text(body, 'h3, h4')

    if (!url || !title) {
      return
    }

    return {
      provider: 'discourse',
      url,
      title,
      description: text(body, 'p'),
      publisher: text(element, 'header.source a'),
      icon: attr(find(element, 'img.site-icon'), 'src'),
      thumbnail: attr(find(element, '.aspect-image img'), 'src'),
    }
  },
}
