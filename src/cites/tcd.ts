import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// TCD, a commercial WordPress theme vendor, renders link cards from a `cardlink_*` vocabulary
// shared across its theme family. The thumbnail sits in an anchor that either wraps a
// `cardlink_thumbnail` element or carries the class itself, so the image is found by descending
// from the class either way. The card's footer ships empty, so there is no publisher to read.
//
// Half the sites emitting these cards close the thumbnail's anchor before its wrapping div, and
// the parser recovers by ending the card early: `cardlink_content` lands as the card's sibling
// rather than its child, taking the title with it. Those cards are left alone. Converting them
// would need the sibling consumed too, which a resolver cannot do, and replacing the card without
// it would leave the title and excerpt behind as loose text beside the placeholder.
export const tcdCiteResolver: CiteResolver = {
  selector: '.cardlink',
  extract: (element) => {
    return buildCite({
      provider: 'tcd',
      url: attr(find(element, '.cardlink_title a'), 'href'),
      title: text(element, '.cardlink_title'),
      description: text(element, '.cardlink_excerpt'),
      // Both spellings of the date class ship in the theme family, split near evenly. A
      // theme-formatted date such as "2022.05.03", passed through for the consumer to parse.
      date: text(element, '.cardlink_timestamp, .timestamp'),
      thumbnail: attr(find(element, '.cardlink_thumbnail img'), 'src'),
    })
  },
}
