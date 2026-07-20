import type { CiteResolver } from '../types.js'
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
    const url = attr(element, 'href')
    const title = text(element, '.blogcard-title') ?? attr(element, 'title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'cocoon',
      url,
      title,
      // Both spellings of the snippet class ship in the wild: `blogcard-snippet` in 1,289
      // corpus feeds and the misspelled `blogcard-snipet` in another 40.
      description: text(element, '.blogcard-snippet, .blogcard-snipet'),
      publisher: text(element, '.blogcard-domain'),
      // A theme-formatted date such as "2018.10.14", not ISO. Passed through as-is for
      // the consumer to parse, since the format follows the site's date settings.
      date: text(element, '.blogcard-post-date'),
      icon: attr(find(element, '.blogcard-favicon-image'), 'src'),
      thumbnail: attr(find(element, '.blogcard-thumb-image'), 'src'),
    }
  },
}
