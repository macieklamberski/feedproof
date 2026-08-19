import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Tistory renders a pasted link as a card built from the linked page's Open Graph tags. The
// `data-og-*` attribute names and the `og-*` class names below are Tistory's, but they map
// straight onto the Open Graph protocol (https://ogp.me): Tistory has frozen the page's OG
// metadata into the post at publish time instead of leaving it in the linked page's <head>.
//
// Every field is duplicated: once as a `data-og-*` attribute on the wrapper and once as an
// element inside the anchor. The attributes are read first because the elements are absent
// on the slimmer card variants.
//
// The selector names the attribute alone. Qualifying it as `figure[data-og-source-url]` would
// miss any variant built from another element, and the collision it guards against does not
// occur: of 801 occurrences measured across 1,590,608 feeds, every one carries the same
// `data-og-*` family and none belongs to another platform.
export const tistoryCiteResolver: CiteResolver = {
  selector: '[data-og-source-url]',
  extract: (element) => {
    return buildCite({
      provider: 'tistory',
      // `data-og-source-url` is the link the author added, which is what the card's own
      // anchor points at. `data-og-url` is the canonical target it resolves to.
      url:
        attr(element, 'data-og-source-url') ??
        attr(element, 'data-og-url') ??
        attr(find(element, 'a'), 'href'),
      title: attr(element, 'data-og-title') ?? text(element, '.og-title'),
      description: attr(element, 'data-og-description') ?? text(element, '.og-desc'),
      publisher: attr(element, 'data-og-host') ?? text(element, '.og-host'),
      // A card can list several candidate images in one attribute, comma separated.
      thumbnail: attr(element, 'data-og-image')?.split(',')[0],
    })
  },
}
