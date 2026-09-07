import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// The theme's stock caption label. Authors can replace it. When they have not, it says
// nothing about the linked site, so an external card showing it yields no publisher.
const defaultCaptionLabel = 'あわせて読みたい'

// SWELL, a widely used WordPress theme, renders its post-link block as a card. The URL sits on the
// title anchor, not on a wrapping element.
//
// The caption bar above the card serves two roles. An external card (`-external`) fills it
// with the linked site's OGP name ("GitHub"), so there it is the publisher. An internal
// card carries the author's own label (the stock "あわせて読みたい" or a custom note),
// which is the embedding author's note about the link, a caption.
export const swellCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.p-blogCard',
  extract: (element) => {
    const link = find(element, 'a.p-blogCard__title')
    const caption = text(element, '.p-blogCard__caption')
    const isExternal = element.matches('.-external')

    return buildCite({
      provider: 'swell',
      url: attr(link, 'href'),
      title: text(link),
      caption: isExternal ? undefined : caption,
      description: text(element, '.p-blogCard__excerpt'),
      publisher: isExternal && caption !== defaultCaptionLabel ? caption : undefined,
      thumbnail: attr(find(element, '.p-blogCard__thumb img'), 'src'),
    })
  },
}
