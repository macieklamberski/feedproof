import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// A hyphenated `blog-card-*` link-card vocabulary emitted by several WordPress themes, distinct
// from Cocoon's unhyphenated `blogcard-*` one. A card cannot be attributed to a theme from its
// markup, so they share one resolver. Two dialects name the same three fields differently, so
// each is read from both spellings. `blog-card-title` is the only class every card carries.
//
// Where the url sits varies with the dialect: some themes make the card itself the anchor, others
// link only the title, others wrap the whole card body in one anchor. The Hatena bookmark button
// most cards carry is excluded throughout, since its href is the target url behind
// `b.hatena.ne.jp/entry/` and would resolve to the wrong host.
const cardUrl = (element: Element): string | undefined => {
  return (
    attr(element, 'href') ??
    attr(find(element, '.blog-card-title a'), 'href') ??
    attr(find(element, 'a:not(.blog-card-hatebu a)'), 'href')
  )
}

export const blogCardCiteResolver: CiteResolver = {
  selector: '.blog-card',
  extract: (element) => {
    return buildCite({
      provider: 'blogcard',
      url: cardUrl(element),
      title: text(element, '.blog-card-title'),
      description: text(element, '.blog-card-excerpt, .blog-card-text'),
      publisher: text(element, '.blog-card-site, .blog-card-site-title'),
      // A theme-formatted date following the site's own settings, not ISO. Passed through
      // as-is for the consumer to parse.
      date: text(element, '.blog-card-date'),
      icon: attr(find(element, '.blog-card-favicon img'), 'src'),
      // A third dialect classes the wrapper div and leaves the img bare.
      thumbnail: attr(
        find(element, '.blog-card-thumb-image, .blog-card-image-src, .blog-card-thumbnail img'),
        'src',
      ),
    })
  },
}
