import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// When the linked article has a date, the generic onebox appends it to the source anchor's
// text ("Whonix – 13 Jan 23") behind this spaced en dash.
const publisherDateSeparator = ' – '

// Discourse forums expand a pasted link into a "onebox" card. The engine that built the
// card varies (a generic one covers 979 of the 1,118 corpus feeds, the rest are per-site
// engines like github or wikipedia), and each engine renders its own body markup, so this
// keys on the wrapper and the fields the generic shape shares rather than on the engine
// subclass. The canonical URL sits on the wrapper, so no inner anchor is needed.
export const discourseCiteResolver: CiteResolver = {
  selector: 'aside.onebox[data-onebox-src]',
  extract: (element) => {
    const body = find(element, '.onebox-body')
    const source = find(element, 'header.source a')
    // The source anchor's title attribute holds the same article date with the year spelled
    // in full ("03:33PM - 13 January 2023"). When it is present, the anchor text carries
    // the short date appended after the site name, so the publisher keeps only the name.
    const timestamp = attr(source, 'title')
    const sourceText = text(source)

    return buildCite({
      provider: 'discourse',
      url: attr(element, 'data-onebox-src'),
      // Engines differ on the heading level they use for the title.
      title: text(body, 'h3, h4'),
      description: text(body, 'p'),
      publisher: timestamp ? sourceText?.split(publisherDateSeparator)[0].trim() : sourceText,
      date: timestamp,
      icon: attr(find(element, 'img.site-icon'), 'src'),
      thumbnail: attr(find(element, '.aspect-image img'), 'src'),
    })
  },
}
