import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// XenForo forums expand a pasted link into an "unfurl" block. The URL and host sit on the
// wrapper, and each field carries a `js-unfurl-*` hook alongside its theme classes. The
// hooks are what this reads: they are near-universal across the corpus (title and favicon
// in 1,283 of 1,284 feeds) while the theme classes vary from site to site.
export const xenforoCiteResolver: CiteResolver = {
  selector: '.bbCodeBlock--unfurl[data-url]',
  extract: (element) => {
    const url = attr(element, 'data-url')
    const title = text(element, '.js-unfurl-title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'xenforo',
      url,
      title,
      description: text(element, '.js-unfurl-desc'),
      publisher: attr(element, 'data-host'),
      icon: attr(find(element, '.js-unfurl-favicon img'), 'src'),
      thumbnail: attr(find(element, '.js-unfurl-figure img'), 'src'),
    }
  },
}
