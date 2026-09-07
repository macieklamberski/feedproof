import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text, textNode } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

// Medium's "mixtape" link card. Two sibling anchors inside a `.graf--mixtapeEmbed` block:
// the text one carries url, title, description and host, and `a.mixtapeImage` carries the
// thumbnail as a CSS `background-image`, with no `<img>` at all. That anchor is often empty
// (Medium adds `mixtapeImage--empty` and no background), so the thumbnail is optional.
//
// This is legacy markup. Medium's current feeds carry plain semantic HTML with no card at
// all (checked across five live publication and user feeds). It still reaches feeds through
// exported Medium archives republished on personal sites, where the generator passes the
// stored HTML through verbatim, so the shape is frozen rather than drifting.
//
// The href is sometimes Medium's own `medium.com/r/?url=` redirector. That is left alone
// here and unwrapped by the injected `cleanUrlFn`, as every other redirect wrapper is.
export const mediumCiteResolver: CiteResolver = {
  kind: 'cite',
  // Medium wraps the pair in `.graf--mixtapeEmbed`. Matching that replaces both anchors and
  // leaves no empty image anchor behind. Exports drop the wrapper, so the bare anchor is the
  // second arm, excluded inside a wrapper so the two never match the same card.
  selector: '.graf--mixtapeEmbed, a.markup--mixtapeEmbed-anchor:not(.graf--mixtapeEmbed a)',
  extract: (element) => {
    const anchor = element.matches('a.markup--mixtapeEmbed-anchor')
      ? element
      : find(element, 'a.markup--mixtapeEmbed-anchor')

    return buildCite({
      provider: 'medium',
      url: attr(anchor, 'href'),
      title: text(anchor, 'strong'),
      description: text(anchor, 'em'),
      thumbnail: styles.bgImage(find(element, '.mixtapeImage')),
      // The host trails the description as a bare text node with no element of its own, so
      // it is read from text nodes only.
      publisher: textNode(anchor),
    })
  },
}
