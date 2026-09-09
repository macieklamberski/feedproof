import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

const imageSrc = (element: Element | undefined): string | undefined => {
  return attr(element, 'src') ?? attr(element, 'data-src')
}

// AFFINGER's card block: an anchor wrapping a card of divs the theme's stylesheet lays out.
export const affingerCiteResolver: CiteResolver = {
  kind: 'cite',
  // Excluding .kanren drops real cards: the theme co-classes it on cards and its related listing.
  // st-cardlink-card and st-cardlink-img belong to the theme's unrelated header-card grid.
  selector: 'a:has(.st-cardbox), .st-cardbox:not(a .st-cardbox)',
  extract: (element) => {
    return buildCite({
      provider: 'affinger',
      // Old-shortcode cards are unwrapped and carry none of the modern classes: the url sits on
      // the title anchor, the thumbnail under a class-less dt and the excerpt in a .smanone or
      // .smanone2 div.
      url: attr(element.closest('a'), 'href') ?? attr(find(element, '.st-cardbox-t a'), 'href'),
      title: text(element, '.st-cardbox-t'),
      caption: text(element, '.st-cardbox-label-text'),
      description:
        text(element, '.st-card-excerpt') ?? text(element, '.smanone > p, .smanone2 > p'),
      publisher: text(element, '.st-cardbox-host'),
      icon: imageSrc(find(element, '.st-cardbox-favicon img')),
      thumbnail: imageSrc(find(element, '.st-card-img img') ?? find(element, 'dt img')),
    })
  },
}
