import { startsWithAnyOf } from 'trousse'
import type { CiteKind, CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Maps the IndieWeb response property an h-cite is wrapped in to the citation kind it names.
// `in-reply-to` uses the shorter `reply`; a bare h-cite with no wrapper stays unset.
// The class carries a `u-` or `p-` prefix depending on whether the value is a URL or the
// nested h-cite itself (WordPress Post Kinds emits `p-in-reply-to`), so both prefixes are
// accepted for every property.
const citeKindByResponseProperty: Record<string, CiteKind> = {
  'bookmark-of': 'bookmark',
  'repost-of': 'repost',
  'like-of': 'like',
  'in-reply-to': 'reply',
  'read-of': 'read',
  'listen-of': 'listen',
  'watch-of': 'watch',
}

const responsePrefixes = ['u-', 'p-']

// h-cite is the microformats2 citation format (https://microformats.org/wiki/h-cite): a
// standard, cross-site way to mark up a reference to another work. Unlike every other
// cite source here it is not a platform convention — any mf2-emitting theme (IndieWeb
// sites, Hugo microblog themes) renders the same classes, so one resolver covers all of
// them. An IndieWeb post commonly wraps the citation in a response class (`u-repost-of`,
// `u-bookmark-of`, `p-in-reply-to`, …) naming the kind of reference; that becomes the `kind`.
//
// The card's own `u-url` / `p-name` must be told apart from the author's: the `p-author`
// is itself an h-card with its own url and name, so those are filtered out by `closest`.
// `caption` stays unset: the citing author's own note about the link sits outside the
// citation, in the surrounding post's content, which contains the citation itself, so
// reading it would capture the whole post rather than a note about the link.
export const microformatsCiteResolver: CiteResolver = {
  selector: '.h-cite',
  extract: (element) => {
    const notInAuthor = (node: Element) => !node.closest('.p-author')

    // `summary` and `content` each come in a plain-text (`p-`) and an HTML (`e-`) spelling.
    // Two separate reads, not one selector list: a list returns the first match in document
    // order, and a stated summary must win over the content even when it sits after it.
    const description =
      find(element, '.p-summary, .e-summary', notInAuthor) ??
      find(element, '.p-content, .e-content', notInAuthor)
    // The image property is `u-featured` in the newer IndieWeb convention and `u-photo` in
    // the base spec.
    const image =
      find(element, '.u-featured', notInAuthor) ?? find(element, '.u-photo', notInAuthor)
    const author = find(element, '.p-author')
    const published = find(element, '.dt-published', notInAuthor)

    const responseProperty = Array.from(element.classList)
      .filter((name) => startsWithAnyOf(name, responsePrefixes))
      .map((name) => name.slice(2))
      .find((property) => Object.hasOwn(citeKindByResponseProperty, property))
    const kind = responseProperty ? citeKindByResponseProperty[responseProperty] : undefined

    return buildCite({
      provider: 'microformats',
      url: attr(find(element, '.u-url', notInAuthor), 'href'),
      title: text(find(element, '.p-name', notInAuthor)),
      description: text(description),
      author: text(author, '.p-name') ?? text(author),
      publisher: text(find(element, '.p-publication', notInAuthor)),
      // A dt-* property carries its machine-readable value in the `datetime` attribute of a
      // `<time>`; other elements only have their text. Passed through unparsed, as the spec
      // allows a bare date as well as a full timestamp.
      date: attr(published, 'datetime') ?? text(published),
      icon: attr(find(element, '.p-author .u-photo'), 'src'),
      thumbnail: attr(image, 'src'),
      kind,
    })
  },
}
