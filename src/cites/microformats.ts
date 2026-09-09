import { type Nullish, startsWithAnyOf, toMap } from 'trousse'
import type { CiteKind, CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

const citeKindByResponseProperty: ReadonlyMap<string, CiteKind> = toMap({
  'bookmark-of': 'bookmark',
  'repost-of': 'repost',
  'like-of': 'like',
  'in-reply-to': 'reply',
  'read-of': 'read',
  'listen-of': 'listen',
  'watch-of': 'watch',
})

// WordPress Post Kinds emits p-in-reply-to, so dropping the p- prefix loses its replies.
// The class carries u- when the value is a url and p- when it is the nested h-cite itself.
const responsePrefixes = ['u-', 'p-']

// See: https://microformats.org/wiki/microformats2-parsing#parsing_a_dt-_property.
// The element's text spells the date out for a reader and can omit the year the attribute states.
const readDateValue = (element: Nullish<Element>): string | undefined => {
  // On any other element, title is a tooltip and value a form default, not the date.
  if (element?.localName === 'abbr') {
    return attr(element, 'title') ?? text(element)
  }

  if (element?.localName === 'data') {
    return attr(element, 'value') ?? text(element)
  }

  return attr(element, 'datetime') ?? text(element)
}

// See: https://microformats.org/wiki/microformats2-parsing#parsing_a_u-_property.
const readImageUrl = (element: Nullish<Element>): string | undefined => {
  return attr(element, 'href') ?? attr(element, 'src')
}

// An h-cite citation, wrapped in an IndieWeb response class naming the kind of reference.
// See: https://microformats.org/wiki/h-cite.
// Any mf2-emitting theme, IndieWeb sites and Hugo microblog themes, renders the same classes.
export const microformatsCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.h-cite',
  extract: (element) => {
    // The p-author is itself an h-card with its own u-url and p-name.
    const notInAuthor = (node: Element) => !node.closest('.p-author')

    // One selector list would return the content when it precedes the summary.
    // `summary` and `content` each come in a plain-text p- and an HTML e- spelling.
    const description =
      find(element, '.p-summary, .e-summary', notInAuthor) ??
      find(element, '.p-content, .e-content', notInAuthor)
    // The image property is `u-featured` in the newer IndieWeb convention and `u-photo` in
    // the base spec.
    const image =
      find(element, '.u-featured', notInAuthor) ?? find(element, '.u-photo', notInAuthor)
    const author = find(element, '.p-author')
    const published = find(element, '.dt-published', notInAuthor)

    const kind = Array.from(element.classList)
      .filter((name) => startsWithAnyOf(name, responsePrefixes))
      .map((name) => citeKindByResponseProperty.get(name.slice(2)))
      .find((named) => named !== undefined)

    return buildCite({
      provider: 'microformats',
      url: attr(find(element, '.u-url', notInAuthor), 'href'),
      title: text(find(element, '.p-name', notInAuthor)),
      description: text(description),
      author: text(author, '.p-name') ?? text(author),
      publisher: text(find(element, '.p-publication', notInAuthor)),
      // Passed through unparsed, as the spec allows a bare date as well as a full timestamp.
      date: readDateValue(published),
      icon: readImageUrl(find(element, '.p-author .u-photo')),
      thumbnail: readImageUrl(image),
      kind,
    })
  },
}
