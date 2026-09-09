import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Cocoon's blogcard: an anchor wrapping a card of divs the theme's stylesheet lays out.
export const cocoonCiteResolver: CiteResolver = {
  kind: 'cite',
  // Internal cards stay: the author places them, unlike the related-posts widgets we strip.
  selector: '.blogcard-wrap',
  extract: (element) => {
    return buildCite({
      provider: 'cocoon',
      url: attr(element, 'href'),
      // The anchor's title attribute repeats the card title.
      title: text(element, '.blogcard-title') ?? attr(element, 'title'),
      // The misspelled `blogcard-snipet` still ships beside the common `blogcard-snippet`.
      description: text(element, '.blogcard-snippet, .blogcard-snipet'),
      // The label bar above the card holds the theme's stock wording or the author's own note.
      caption: text(element, '.blogcard-label'),
      publisher: text(element, '.blogcard-domain'),
      // A theme-formatted date such as "2018.10.14", not ISO. Passed through as-is for
      // the consumer to parse, since the format follows the site's date settings.
      date: text(element, '.blogcard-post-date'),
      icon: attr(find(element, '.blogcard-favicon-image'), 'src'),
      thumbnail: attr(find(element, '.blogcard-thumb-image'), 'src'),
    })
  },
}
