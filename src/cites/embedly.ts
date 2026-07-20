import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// Embedly's platform.js turns an `.embedly-card` anchor or blockquote into an iframe on the
// live page; in a feed the static form survives. Two shapes share the class: a bare anchor
// (`<a class="embedly-card" href>Title</a>`) and a blockquote (`<blockquote class="embedly-card">
// <h4><a href>Title</a></h4><p>Description</p></blockquote>`). The rich card (thumbnail,
// publisher) only exists in the hydrated iframe, so the feed form carries url + title and,
// for the blockquote, a description.
export const embedlyCiteResolver: CiteResolver = {
  selector: '.embedly-card',
  extract: (element) => {
    const url = attr(element, 'href') ?? attr(find(element, 'a'), 'href')
    const title = text(element, 'h4') ?? text(element)

    if (!url || !title) {
      return
    }

    return {
      provider: 'embedly',
      url,
      title,
      description: text(element, 'p'),
    }
  },
}
