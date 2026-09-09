import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text, textNode } from '../utils/dom.js'

// NodeBB's link-preview plugin card: a Bootstrap card stored in the post HTML.
// Core bundles the plugin since 4.7.0 but leaves it off, so only forums that turned it on emit it.
export const nodebbCiteResolver: CiteResolver = {
  kind: 'cite',
  // Either class alone is one any theme can mint, so the pair is the match.
  selector: '.card.link-preview',
  extract: (element) => {
    return buildCite({
      provider: 'nodebb',
      // The image, title and footer anchors all carry the same target url.
      url: attr(find(element, '.card-title a'), 'href') ?? attr(find(element, 'a'), 'href'),
      title: text(element, '.card-title'),
      description: text(element, '.card-text'),
      // text() would append the (domain) span to the site name.
      publisher: textNode(find(element, '.card-footer p')),
      icon: attr(find(element, '.card-footer img'), 'src'),
      thumbnail: attr(find(element, '.card-img-top'), 'src'),
    })
  },
}
