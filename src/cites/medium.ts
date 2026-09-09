import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text, textNode } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// Medium's mixtape link card: two anchors, the thumbnail as a CSS background with no <img>.
// Current Medium feeds carry no card: it arrives through exported archives on personal sites.
export const mediumCiteResolver: CiteResolver = {
  kind: 'cite',
  // Exports drop the .graf--mixtapeEmbed wrapper, leaving the bare anchor.
  selector: '.graf--mixtapeEmbed, a.markup--mixtapeEmbed-anchor:not(.graf--mixtapeEmbed a)',
  extract: (element) => {
    const anchor = element.matches('a.markup--mixtapeEmbed-anchor')
      ? element
      : find(element, 'a.markup--mixtapeEmbed-anchor')

    return buildCite({
      provider: 'medium',
      // The href is sometimes Medium's own medium.com/r/?url= redirector.
      url: attr(anchor, 'href'),
      title: text(anchor, 'strong'),
      description: text(anchor, 'em'),
      // The image anchor is often empty: Medium adds mixtapeImage--empty and no background.
      thumbnail: styles.bgImage(find(element, '.mixtapeImage')),
      // The host trails the description as a bare text node with no element of its own, so
      // it is read from text nodes only.
      publisher: textNode(anchor),
    })
  },
}
