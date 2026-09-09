import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// note.com's external-article card, stripped of every class and style by its RSS sanitizer.
// The sanitizer leaves <a><strong>title</strong><em>description</em><em>host</em></a>, and page
// HTML carries the classful external-article-widget-* tree with a CSS background-image thumbnail.
export const notecomCiteResolver: CiteResolver = {
  kind: 'cite',
  // The same embedded-service value also marks shopping and crowdfunding cards, which never carry
  // both a title and an anchor.
  selector: 'figure[embedded-service="external-article"]',
  extract: (element) => {
    const ems = Array.from(element.querySelectorAll('a > em'))
    // The stripped shape's host is always the last `em`, so a lone `em` has no description.
    const hostEm = ems.at(-1)
    // A lone em is the host, not a description.
    const descriptionEm = ems.length > 1 ? ems[0] : undefined

    return buildCite({
      provider: 'notecom',
      url: attr(find(element, 'a'), 'href'),
      title: text(element, '.external-article-widget-title') ?? text(element, 'a > strong'),
      description: text(element, '.external-article-widget-description') ?? text(descriptionEm),
      publisher: text(element, '.external-article-widget-url') ?? text(hostEm),
      thumbnail: styles.bgImage(find(element, '.external-article-widget-image')),
    })
  },
}
