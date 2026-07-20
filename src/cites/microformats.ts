import type { CiteKind, CiteResolver } from '../types.js'

// Maps the IndieWeb response class an h-cite is wrapped in to the citation kind it names.
// `u-in-reply-to` uses the shorter `reply`; a bare h-cite with no wrapper stays unset.
const citeKindByResponseClass: Record<string, CiteKind> = {
  'u-bookmark-of': 'bookmark',
  'u-repost-of': 'repost',
  'u-like-of': 'like',
  'u-in-reply-to': 'reply',
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
export const microformatsCiteResolver: CiteResolver = {
  selector: '.h-cite',
  extract: (element) => {
    const notInAuthor = (node: Element) => !node.closest('.p-author')

    const url = Array.from(element.querySelectorAll('.u-url'))
      .find(notInAuthor)
      ?.getAttribute('href')
    const title = Array.from(element.querySelectorAll('.p-name'))
      .find(notInAuthor)
      ?.textContent?.trim()

    if (!url || !title) {
      return
    }

    const description = Array.from(element.querySelectorAll('.p-summary, .p-content')).find(
      notInAuthor,
    )
    // The image property is `u-featured` in the newer IndieWeb convention and `u-photo` in
    // the base spec; prefer the former and fall back to the latter.
    const image = Array.from(element.querySelectorAll('.u-featured, .u-photo')).find(notInAuthor)
    const author = element.querySelector('.p-author')

    const responseClass = Array.from(element.classList).find(
      (name) => name in citeKindByResponseClass,
    )
    const kind = responseClass ? citeKindByResponseClass[responseClass] : undefined

    return {
      provider: 'microformats',
      url,
      title,
      description: description?.textContent ?? undefined,
      author: author?.querySelector('.p-name')?.textContent ?? author?.textContent ?? undefined,
      thumbnail: image?.getAttribute('src') ?? undefined,
      kind,
    }
  },
}
