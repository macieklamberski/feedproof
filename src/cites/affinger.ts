import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// AFFINGER, a widely used Japanese WordPress theme, renders its card block as a wrapping
// anchor around `.st-cardbox`. Cards are mostly internal: the `[st-card]` shortcode takes a
// post id and has no url parameter, and the external variant (`st-cardbox-ex`) needs a paid
// add-on, which the corpus bears out: zero external cards against every internal one.
//
// Two traps. `kanren` (関連, "related") is the theme's related-posts *listing*, a multi-entry
// block of the site's own posts, but it is also co-classed on real cards, so it is useless as
// a signal in either direction: the match keys on `st-cardbox` and never on `kanren`.
// And `st-cardlink-card`/`st-cardlink-img` belong to the unrelated header-card grid, so the
// anchor is matched by what it contains rather than by an `st-cardlink` prefix.
//
// Images carry `src` in feeds but `data-src` on rendered pages, since the theme skips its
// lazy-loading in feed context.
const imageSrc = (element: Element | undefined): string | undefined => {
  return attr(element, 'src') ?? attr(element, 'data-src')
}

export const affingerCiteResolver: CiteResolver = {
  // The anchor is the match so that replacing it swaps out the whole link. The second arm
  // takes cards that are not wrapped, and excludes wrapped ones so the two never overlap.
  //
  // Old-shortcode cards are unwrapped and carry none of the modern classes: the url sits on
  // the title anchor, the thumbnail under a class-less `dt`, and the excerpt in a
  // `.smanone`/`.smanone2` div. The excerpt is read per-paragraph because `.smanone2` nests
  // the more-link inside the div. The theme also emits `.st-cardbox` as a link-less callout
  // box, which the missing title and url still drop.
  selector: 'a:has(.st-cardbox), .st-cardbox:not(a .st-cardbox)',
  extract: (element) => {
    return buildCite({
      provider: 'affinger',
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
