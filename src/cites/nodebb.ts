import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text, textNode } from '../utils/dom.js'

// NodeBB's link-preview plugin rewrites a pasted link into a Bootstrap card that it stores in
// the post HTML, so it survives into the feed body. Core has bundled the plugin since NodeBB
// 4.7.0 and does not enable it: `install/package.json` lists it from that tag and not in 4.6.3,
// and `src/install.js` leaves it out of `defaultEnabled`, so these cards come only from a forum
// whose admin turned it on (read 2026-09-08 at 4.15.2).
//
// The wrapper is a generic Bootstrap `card` carrying a `link-preview` class beside it, and either
// name alone is one any theme can mint, so the selector asks for the pair. The three anchors
// (image, title, footer) all carry the same target url. The footer holds the site name as a bare
// text node next to a `(domain)` span, so `textNode` gets the name without the domain.
export const nodebbCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.card.link-preview',
  extract: (element) => {
    return buildCite({
      provider: 'nodebb',
      url: attr(find(element, '.card-title a'), 'href') ?? attr(find(element, 'a'), 'href'),
      title: text(element, '.card-title'),
      description: text(element, '.card-text'),
      publisher: textNode(find(element, '.card-footer p')),
      icon: attr(find(element, '.card-footer img'), 'src'),
      thumbnail: attr(find(element, '.card-img-top'), 'src'),
    })
  },
}
