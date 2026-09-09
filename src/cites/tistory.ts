import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// Tistory renders a pasted link as a card of the page's Open Graph tags frozen in at publish time.
export const tistoryCiteResolver: CiteResolver = {
  kind: 'cite',
  // Qualifying the attribute with figure misses the variants built from another element, and the
  // bare attribute collides with nothing: no other platform emits data-og-*.
  selector: '[data-og-source-url]',
  extract: (element) => {
    return buildCite({
      provider: 'tistory',
      // data-og-url is the canonical target, not the link the author added.
      // data-og-source-url is the link the author added and what the card's own anchor points at.
      url:
        attr(element, 'data-og-source-url') ??
        attr(element, 'data-og-url') ??
        attr(find(element, 'a'), 'href'),
      // Every field ships twice, a data-og-* attribute on the wrapper and an og-* element inside
      // the anchor, and the slimmer card variants omit the elements.
      title: attr(element, 'data-og-title') ?? text(element, '.og-title'),
      description: attr(element, 'data-og-description') ?? text(element, '.og-desc'),
      publisher: attr(element, 'data-og-host') ?? text(element, '.og-host'),
      // A card can list several candidate images, comma separated, in the attribute and the
      // element alike.
      thumbnail: (
        attr(element, 'data-og-image') ?? styles.bgImage(find(element, '.og-image'))
      )?.split(',')[0],
    })
  },
}
