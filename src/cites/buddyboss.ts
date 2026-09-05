import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// BuddyBoss unfurls a link pasted into an activity post into a preview it stores in the post
// body, so it reaches the feed as markup: the page image linked to the page, the bare host as
// the link name, the title link and an excerpt, all under one `bb-link-preview-container`.
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
