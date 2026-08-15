import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Cocoon, a widely used WordPress theme, renders link cards for both external links and
// same-site posts. The wrapping element is the anchor itself, so the URL comes
// from the matched element rather than a descendant, and the anchor's `title` attribute
// repeats the card title as a fallback. Internal (same-site) cards are treated like
// external ones: the author places them in the editor, unlike the related-posts widgets
// we strip, which themes append to every post automatically.
export const cocoonCiteResolver: CiteResolver = {
  selector: '.blogcard-wrap',
  extract: (element) => {
    return buildCite({
      provider: 'cocoon',
      url: attr(element, 'href'),
      title: text(element, '.blogcard-title') ?? attr(element, 'title'),
      // Both spellings of the snippet class ship in the wild: `blogcard-snippet` in 1,289
      // corpus feeds and the misspelled `blogcard-snipet` in another 40.
      description: text(element, '.blogcard-snippet, .blogcard-snipet'),
      // The bar above the card, holding either the theme's stock wording or the author's own
      // note about the link. Carried whichever it is, the way SWELL carries its equivalent:
      // the stock label is still what the author's page shows, and the publisher is read from
      // the domain here rather than from this bar, so a generic label cannot pollute it.
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
