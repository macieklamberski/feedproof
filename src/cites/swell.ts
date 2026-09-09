import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// The theme's stock caption label. Authors can replace it. When they have not, it says
// nothing about the linked site, so an external card showing it yields no publisher.
const defaultCaptionLabel = 'あわせて読みたい' // The theme's stock caption label, "read this too"

// SWELL's post-link block renders as a card whose url sits on the title anchor, not a wrapper.
export const swellCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.p-blogCard',
  extract: (element) => {
    const link = find(element, 'a.p-blogCard__title')
    // An external card fills the caption with the linked site's OGP name, such as "GitHub". An
    // internal card carries the author's own label, the stock one or a custom note.
    const caption = text(element, '.p-blogCard__caption')
    const isExternal = element.matches('.-external')

    return buildCite({
      provider: 'swell',
      url: attr(link, 'href'),
      title: text(link),
      caption: isExternal ? undefined : caption,
      description: text(element, '.p-blogCard__excerpt'),
      // The stock label names no site, so an external card still showing it has no publisher.
      publisher: isExternal && caption !== defaultCaptionLabel ? caption : undefined,
      thumbnail: attr(find(element, '.p-blogCard__thumb img'), 'src'),
    })
  },
}
