import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, keepIfMatches, text, textNode } from '../utils/dom.js'

// Forem renders the card date without a year when the post's year matched the embedding
// article's save year ("Jul 25"), and the save year itself is unrecoverable later, so only
// dates spelling a year ("Aug 21, 2025", "Nov 6 '22") are worth passing through.
const yearRegex = /\b(19|20)\d{2}\b|'\d{2}\b/

// A yearless "Jul 25" is one whose year matched the save year, which nothing can recover.
const dateWithYear = (value: string | undefined): string | undefined => {
  return keepIfMatches(value, yearRegex)
}

// Forem's embed card for an external link, compiled into the stored body as bare divs.
// The feed sanitizer's allowlist keeps div, class and id intact.
export const devtoLinkCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.c-embed',
  extract: (element) => {
    const body = find(element, '.c-embed__body')
    const favicon = find(element, 'img.c-embed__favicon')

    return buildCite({
      provider: 'devto',
      url: attr(find(body, 'h2 a'), 'href') ?? attr(find(element, '.c-embed__cover a'), 'href'),
      title: text(body, 'h2'),
      description: text(body, 'p'),
      // The publisher is a bare text node beside the favicon image, with no element of its
      // own, so it is read from the favicon's parent, text nodes only.
      publisher: textNode(favicon?.parentElement),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.c-embed__cover img'), 'src'),
    })
  },
}

// Forem's card for another dev.to post, frozen at save time in the markup its generator emitted.
export const devtoPostCiteResolver: CiteResolver = {
  kind: 'cite',
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
      // title. An ordinary post card has none.
      description:
        text(element, '.crayons-article__context-note') ??
        text(element, '.crayons-story__contentpreview'),
      // The author anchor always precedes the organization's, so the first match is never the org.
      // Forem always renders the author anchor and wraps the organization's in a "for <org>" span.
      author: text(element, 'a.crayons-story__secondary'),
      publisher: text(element, 'span > a.crayons-story__secondary'),
      date: dateWithYear(text(element, 'time')),
      icon: attr(find(element, '.crayons-story__author-pic img'), 'src'),
    })
  },
}

// The shape the same card had from 2019 until March 2026. Its byline packs author and date
// into one text node (`Name ・ Aug 25 '22`, with a reading time appended on older posts).
const authorSeparator = '・' // Katakana middle dot, U+30FB

// The dev.to post card Forem shipped before March 2026, still frozen in the bodies saved then.
export const devtoLegacyPostCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.ltag__link',
  extract: (element) => {
    const content = find(element, '.ltag__link__content')
    const [author, date] = text(content, 'h3')?.split(authorSeparator) ?? []

    return buildCite({
      provider: 'devto',
      url: attr(content?.closest('a'), 'href'),
      title: text(content, 'h2'),
      author,
      // The Medium liquid tag compiles into the same tree and names the service where a dev.to
      // card has a tag list, writing the article's host into it. Everything else it renders is
      // in the same place, so the card reads whole and the service is the publisher.
      publisher: text(element, '.ltag__link__servicename'),
      date: dateWithYear(date),
      icon: attr(find(element, '.ltag__link__pic img'), 'src'),
    })
  },
}
