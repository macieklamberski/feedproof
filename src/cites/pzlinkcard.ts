import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// Pz-LinkCard is a widely used WordPress link-card plugin. Like Cocoon the whole card sits
// inside a wrapping anchor, so the url comes from the nearest ancestor `<a>` rather than a
// descendant. The favicon is the linked site's real favicon fetched through Google's
// service (`google.com/s2/favicons?domain=…`), so it is a usable icon, not decorative.
// The share-count block (`.lkc-share`) is dropped.
export const pzlinkcardCiteResolver: CiteResolver = {
  selector: '.lkc-card',
  extract: (element) => {
    const url = attr(element.closest('a'), 'href')
    const title = text(element, '.lkc-title-text') ?? text(element, '.lkc-title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'pzlinkcard',
      url,
      title,
      description: text(element, '.lkc-excerpt'),
      publisher: text(element, '.lkc-domain'),
      icon: attr(find(element, '.lkc-favicon'), 'src'),
      thumbnail: attr(find(element, '.lkc-thumbnail-img'), 'src'),
    }
  },
}
