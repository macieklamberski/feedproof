import type { CiteKind, CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Maps the IndieWeb response class an h-cite is wrapped in to the citation kind it names.
// `u-in-reply-to` uses the shorter `reply`; a bare h-cite with no wrapper stays unset.
// mf2 spells the same property `u-` or `p-` depending on whether the value is a URL or the
// nested h-cite itself; WordPress Post Kinds emits the `p-` spelling for replies.
const citeKindByResponseClass: Record<string, CiteKind> = {
  'u-bookmark-of': 'bookmark',
  'u-repost-of': 'repost',
  'u-like-of': 'like',
  'u-in-reply-to': 'reply',
  'p-in-reply-to': 'reply',
  'u-read-of': 'read',
  'u-listen-of': 'listen',
  'u-watch-of': 'watch',
}

// h-cite is the microformats2 citation format (https://microformats.org/wiki/h-cite): a
// standard, cross-site way to mark up a reference to another work. Unlike every other
// cite source here it is not a platform convention — any mf2-emitting theme (IndieWeb
// sites, Hugo microblog themes) renders the same classes, so one resolver covers all of
// them. An IndieWeb post commonly wraps the citation in a `u-{repost,bookmark,like,read,
// listen,watch,in-reply}-of` class naming the kind of reference; that becomes the `kind`.
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

    // `p-content` and `e-content` are the same property in its plain-text and HTML
    // spellings, and `summary` comes in the same two; either summary wins over content when
    // the source states one separately.
    const description = find(element, '.p-summary, .e-summary, .p-content, .e-content', notInAuthor)
    // The image property is `u-featured` in the newer IndieWeb convention and `u-photo` in
    // the base spec; prefer the former and fall back to the latter.
    const image = find(element, '.u-featured, .u-photo', notInAuthor)
    const author = find(element, '.p-author')
    const published = find(element, '.dt-published', notInAuthor)

    const responseClass = Array.from(element.classList).find(
      (name) => name in citeKindByResponseClass,
    )
    const kind = responseClass ? citeKindByResponseClass[responseClass] : undefined

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
