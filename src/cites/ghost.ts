import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

export const ghostCiteResolver: CiteResolver = {
  selector: '.kg-bookmark-card',
  extract: (element) => {
    const url = attr(find(element, 'a.kg-bookmark-container'), 'href')
    const title = text(element, '.kg-bookmark-title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'ghost',
      url,
      title,
      description: text(element, '.kg-bookmark-description'),
      // Ghost's renderer intentionally reverses these two classes for theme
      // backwards-compatibility: .kg-bookmark-author holds the publisher name and
      // .kg-bookmark-publisher holds the author name. Ghost's own note about it:
      // https://github.com/TryGhost/Ghost/blob/6e15b9d5bcceffcfef78e488f30692ce370ba928/koenig/kg-default-nodes/src/nodes/bookmark/bookmark-renderer.ts#L168
      author: text(element, '.kg-bookmark-publisher'),
      publisher: text(element, '.kg-bookmark-author'),
      caption: text(element, 'figcaption'),
      icon: attr(find(element, 'img.kg-bookmark-icon'), 'src'),
      thumbnail: attr(find(element, '.kg-bookmark-thumbnail img'), 'src'),
    }
  },
}
