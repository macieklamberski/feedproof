import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

export const ghostCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.kg-bookmark-card',
  extract: (element) => {
    return buildCite({
      provider: 'ghost',
      url: attr(find(element, 'a.kg-bookmark-container'), 'href'),
      title: text(element, '.kg-bookmark-title'),
      description: text(element, '.kg-bookmark-description'),
      // Ghost swaps these two classes on purpose, so the publisher class holds the author:
      // https://github.com/TryGhost/Ghost/blob/6e15b9d5bcceffcfef78e488f30692ce370ba928/koenig/kg-default-nodes/src/nodes/bookmark/bookmark-renderer.ts#L168
      author: text(element, '.kg-bookmark-publisher'),
      publisher: text(element, '.kg-bookmark-author'),
      caption: text(element, 'figcaption'),
      icon: attr(find(element, 'img.kg-bookmark-icon'), 'src'),
      thumbnail: attr(find(element, '.kg-bookmark-thumbnail img'), 'src'),
    })
  },
}
