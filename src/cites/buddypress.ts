import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// BuddyPress's link preview: unfurled into the activity update as bare divs the theme styles.
// The preview names no host, so there is no publisher.
export const buddypressCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.activity-link-preview-container',
  extract: (element) => {
    return buildCite({
      provider: 'buddypress',
      url:
        attr(find(element, '.activity-link-preview-title a'), 'href') ??
        attr(find(element, 'a'), 'href'),
      title: text(element, '.activity-link-preview-title'),
      description: text(element, '.activity-link-preview-excerpt'),
      thumbnail: attr(find(element, '.activity-link-preview-image img'), 'src'),
    })
  },
}
