import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// BuddyBoss's link preview: unfurled into the activity post body as bare divs the theme styles.
export const buddybossCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.bb-link-preview-container',
  extract: (element) => {
    return buildCite({
      provider: 'buddyboss',
      url:
        attr(find(element, '.bb-link-preview-title a'), 'href') ?? attr(find(element, 'a'), 'href'),
      title: text(element, '.bb-link-preview-title'),
      description: text(element, '.bb-link-preview-excerpt'),
      publisher: text(element, '.bb-link-preview-link-name'),
      thumbnail: attr(find(element, '.bb-link-preview-image img'), 'src'),
    })
  },
}
