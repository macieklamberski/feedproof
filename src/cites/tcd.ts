import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// TCD's WordPress theme family renders a pasted link as a card, the thumbnail in its own anchor.
// The card's footer ships empty. Half the sites close the thumbnail anchor before its div, and
// the parser then lands cardlink_content, title included, as the card's sibling.
export const tcdCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.cardlink',
  extract: (element) => {
    return buildCite({
      provider: 'tcd',
      url: attr(find(element, '.cardlink_title a'), 'href'),
      title: text(element, '.cardlink_title'),
      description: text(element, '.cardlink_excerpt'),
      // The theme family ships the bare .timestamp too, so dropping it loses those dates.
      // The date is theme-formatted, such as "2022.05.03".
      date: text(element, '.cardlink_timestamp, .timestamp'),
      // The anchor either wraps a .cardlink_thumbnail element or carries the class itself.
      thumbnail: attr(find(element, '.cardlink_thumbnail img'), 'src'),
    })
  },
}
