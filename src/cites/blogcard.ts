import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Where the url sits varies with the theme: some make the card itself the anchor, others link
// only the title, others wrap the whole card body in one anchor. Most cards also carry a Hatena
// bookmark button, .blog-card-hatebu, whose href is the target behind b.hatena.ne.jp/entry/.
const cardUrl = (element: Element): string | undefined => {
  return (
    attr(element, 'href') ??
    attr(find(element, '.blog-card-title a'), 'href') ??
    attr(find(element, 'a:not(.blog-card-hatebu a)'), 'href')
  )
}

// The hyphenated blog-card several WordPress themes emit: divs whose layout lives in theme CSS.
// Cocoon's unhyphenated blogcard-* classes are a different card.
export const blogCardCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.blog-card',
  extract: (element) => {
    return buildCite({
      provider: 'blogcard',
      url: cardUrl(element),
      // blog-card-title is the only field class every card carries.
      title: text(element, '.blog-card-title'),
      description: text(element, '.blog-card-excerpt, .blog-card-text'),
      publisher: text(element, '.blog-card-site, .blog-card-site-title'),
      // A theme-formatted date following the site's own settings, not ISO. Passed through
      // as-is for the consumer to parse.
      date: text(element, '.blog-card-date'),
      icon: attr(find(element, '.blog-card-favicon img'), 'src'),
      thumbnail: attr(
        find(element, '.blog-card-thumb-image, .blog-card-image-src, .blog-card-thumbnail img'),
        'src',
      ),
    })
  },
}
