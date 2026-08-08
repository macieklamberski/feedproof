import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, bgImage, find, text } from '../utils/dom.js'

// note.com renders a pasted link as an `external-article` figure. The same
// `embedded-service="external-article"` attribute also marks shopping and crowdfunding
// cards, but those never carry both a title and an anchor, so the guards drop them.
//
// The card exists in two shapes. Page HTML carries the classful `external-article-widget-*`
// tree, with the thumbnail as a CSS `background-image` on the image anchor. Feed bodies
// pass through note.com's RSS sanitizer, which strips every class and style, leaving
// `<a><strong>title</strong><em>description</em><em>host</em></a>` (some older cards carry
// the description and host as bare text runs instead of `em`s, where only the title is
// recoverable).
export const notecomCiteResolver: CiteResolver = {
  selector: 'figure[embedded-service="external-article"]',
  extract: (element) => {
    const emphases = Array.from(element.querySelectorAll('a > em'))

    return buildCite({
      provider: 'notecom',
      url: attr(find(element, 'a'), 'href'),
      title: text(element, '.external-article-widget-title') ?? text(element, 'a > strong'),
      description:
        text(element, '.external-article-widget-description') ??
        (emphases.length > 1 ? text(emphases[0]) : undefined),
      // In the stripped shape the host always sits in the last `em`; a lone `em` is the
      // host with no description before it.
      publisher: text(element, '.external-article-widget-url') ?? text(emphases.at(-1)),
      thumbnail: bgImage(find(element, '.external-article-widget-image')),
    })
  },
}
