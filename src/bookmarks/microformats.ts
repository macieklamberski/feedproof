import type { BookmarkResolver } from '../types.js'

// h-cite is the microformats2 citation format (https://microformats.org/wiki/h-cite): a
// standard, cross-site way to mark up a reference to another work. Unlike every other
// bookmark source here it is not a platform convention — any mf2-emitting theme (IndieWeb
// sites, Hugo microblog themes) renders the same classes, so one resolver covers all of
// them. Commonly an IndieWeb post wraps the citation in a `u-{repost,bookmark,like,read,
// listen,in-reply}-of` class that names the kind of reference; that hint is available on
// the element but is not yet surfaced (BookmarkResolverResult has no kind field).
//
// The card's own `u-url` / `p-name` must be told apart from the author's: the `p-author`
// is itself an h-card with its own url and name, so those are filtered out by `closest`.
export const microformatsBookmarkResolver: BookmarkResolver = {
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

    return {
      provider: 'microformats',
      url,
      title,
      description: description?.textContent ?? undefined,
      author: author?.querySelector('.p-name')?.textContent ?? author?.textContent ?? undefined,
      thumbnail: image?.getAttribute('src') ?? undefined,
    }
  },
}
