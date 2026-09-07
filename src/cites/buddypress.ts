import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// BuddyPress unfurls a link pasted into an activity update into a preview it stores in the
// update itself, so it reaches the activity feed as markup: the title link, the page image
// linked to the page and an excerpt, all under one `activity-link-preview-container`. Unlike
// its commercial sibling it names no host, so there is no publisher to read.
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
