import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Pz-LinkCard's WordPress link card: the whole card sits inside one anchor to the target.
export const pzlinkcardCiteResolver: CiteResolver = {
  kind: 'cite',
  // Matching the card inside its anchor leaves the anchor wrapping the placeholder, and anchors
  // cannot nest, so it reparses into a stray empty link.
  selector: 'a:has(.lkc-card), .lkc-card:not(a .lkc-card)',
  extract: (element) => {
    // The favicon is the linked site's own, fetched through google.com/s2/favicons?domain=…, and
    // the class sits on the img in some installs and on a wrapper div around it in others.
    const favicon = find(element, '.lkc-favicon img') ?? find(element, '.lkc-favicon')

    return buildCite({
      provider: 'pzlinkcard',
      // A card with no wrapping anchor prints the target in .lkc-url.
      url: attr(element.closest('a'), 'href') ?? text(element, '.lkc-url'),
      title: text(element, '.lkc-title-text') ?? text(element, '.lkc-title'),
      description: text(element, '.lkc-excerpt'),
      publisher: text(element, '.lkc-domain'),
      // A full site-formatted date (e.g. "2023年6月8日"). The clock emoji beside it is an
      // `<img>` in feeds, so the text comes out clean.
      date: text(element, '.lkc-date'),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.lkc-thumbnail-img'), 'src'),
    })
  },
}
