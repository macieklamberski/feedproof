import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Pz-LinkCard is a widely used WordPress link-card plugin. Like Cocoon the whole card sits
// inside a wrapping anchor, so the url comes from the nearest ancestor `<a>` rather than a
// descendant. The favicon is the linked site's real favicon fetched through Google's
// service (`google.com/s2/favicons?domain=…`), so it is a usable icon, not decorative.
// The share-count block (`.lkc-share`) is dropped.
//
// Installs differ in three ways, all seen in live feeds, so each field is hedged:
// the title is either `.lkc-title` directly or nested in `.lkc-title-text`; the favicon
// class sits either on the `<img>` itself or on a wrapper `<div>` around it; and a card
// may have no wrapping anchor at all, printing the target in `.lkc-url` instead.
export const pzlinkcardCiteResolver: CiteResolver = {
  // The wrapping anchor is matched rather than the card inside it, so that replacing the
  // match swaps out the whole link. Matching `.lkc-card` alone left the anchor behind
  // wrapping the placeholder, which reparses into a stray empty link before every card.
  selector: 'a:has(.lkc-card), .lkc-card',
  extract: (element) => {
    const anchor = element.closest('a')

    // Both arms match a wrapped card; the anchor comes first in document order and owns
    // it, so the inner card is skipped rather than converted a second time.
    if (anchor && anchor !== element) {
      return
    }

    const favicon = find(element, '.lkc-favicon img') ?? find(element, '.lkc-favicon')

    return buildCite({
      provider: 'pzlinkcard',
      url: attr(anchor, 'href') ?? text(element, '.lkc-url'),
      title: text(element, '.lkc-title-text') ?? text(element, '.lkc-title'),
      description: text(element, '.lkc-excerpt'),
      publisher: text(element, '.lkc-domain'),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.lkc-thumbnail-img'), 'src'),
    })
  },
}
