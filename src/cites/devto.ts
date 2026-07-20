import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text, textNode } from '../utils/dom.js'

// dev.to (Forem) turns a pasted link into an embed card. Forem compiles its liquid tags to
// HTML when the article is saved, so the card is already in the stored body by the time the
// feed renders, and the feed sanitizer's allowlist keeps `div`, `class` and `id` intact.
// An external link becomes `.c-embed`; a link to another dev.to post becomes one of the two
// shapes below.
export const devtoCiteResolver: CiteResolver = {
  selector: '.c-embed',
  extract: (element) => {
    const body = find(element, '.c-embed__body')
    const favicon = find(element, 'img.c-embed__favicon')

    return buildCite({
      provider: 'devto',
      url: attr(find(body, 'h2 a'), 'href') ?? attr(find(element, '.c-embed__cover a'), 'href'),
      title: text(body, 'h2'),
      description: text(body, 'p'),
      // The publisher is a bare text node beside the favicon image rather than an element
      // of its own, so it is read from the favicon's parent, text nodes only.
      publisher: textNode(favicon?.parentElement),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.c-embed__cover img'), 'src'),
    })
  },
}

// A card for another dev.to post. Because Forem freezes the compiled HTML at save time, an
// article keeps whatever markup its generator emitted, so both this shape and the older one
// below stay in circulation indefinitely and each needs its own resolver.
export const devtoPostCiteResolver: CiteResolver = {
  selector: '.ltag__link--embedded',
  extract: (element) => {
    const heading = find(element, '.crayons-story__title')

    return buildCite({
      provider: 'devto',
      url:
        attr(find(element, 'a.crayons-story__hidden-navigation-link'), 'href') ??
        attr(find(heading, 'a'), 'href'),
      title: text(heading, 'a'),
      // Only posts carrying a context note or a status preview have any text beside the
      // title; an ordinary post card has none.
      description:
        text(element, '.crayons-article__context-note') ??
        text(element, '.crayons-story__contentpreview'),
      // Author and organization share a class. The author comes first in the document, and
      // the organization is the one wrapped in the `for <org>` span.
      author: text(element, 'a.crayons-story__secondary'),
      publisher: text(element, 'span > a.crayons-story__secondary'),
    })
  },
}

// The shape the same card had from 2019 until March 2026. Its byline packs author and date
// into one text node (`Name ・ Aug 25 '22`, with a reading time appended on older posts).
// Only the author is read: the date is a display string, not a machine-readable one.
const authorSeparator = '・'

export const devtoLegacyPostCiteResolver: CiteResolver = {
  selector: '.ltag__link',
  extract: (element) => {
    // The Medium liquid tag renders into the same class tree. It has no tag list and names
    // the service instead, which separates the two.
    if (find(element, '.ltag__link__servicename')) {
      return
    }

    const content = find(element, '.ltag__link__content')
    const [author] = text(content, 'h3')?.split(authorSeparator) ?? []

    return buildCite({
      provider: 'devto',
      url: attr(content?.closest('a'), 'href'),
      title: text(content, 'h2'),
      author,
    })
  },
}
