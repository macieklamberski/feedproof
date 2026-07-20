import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// SWELL, a widely used WordPress theme, renders its post-link block as a card. Unlike
// Cocoon the URL sits on the title anchor rather than on a wrapping element. Internal
// and external cards get the same treatment; the theme's own caption ("recommended
// reading" and similar) is dropped, since the card carries the link on its own.
export const swellCiteResolver: CiteResolver = {
  selector: '.p-blogCard',
  extract: (element) => {
    const link = find(element, 'a.p-blogCard__title')

    return buildCite({
      provider: 'swell',
      url: attr(link, 'href'),
      title: text(link),
      description: text(element, '.p-blogCard__excerpt'),
      thumbnail: attr(find(element, '.p-blogCard__thumb img'), 'src'),
    })
  },
}
