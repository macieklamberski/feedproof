import type { BookmarkResolver } from '../types.js'

// XenForo forums expand a pasted link into an "unfurl" block. The URL and host sit on the
// wrapper, and each field carries a `js-unfurl-*` hook alongside its theme classes. The
// hooks are what this reads: they are near-universal across the corpus (title and favicon
// in 1,283 of 1,284 feeds) while the theme classes vary from site to site.
export const xenforoBookmarkResolver: BookmarkResolver = {
  selector: '.bbCodeBlock--unfurl[data-url]',
  extract: (element) => {
    const url = element.getAttribute('data-url') ?? undefined
    const title = element.querySelector('.js-unfurl-title')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'xenforo',
      url,
      title,
      description: element.querySelector('.js-unfurl-desc')?.textContent ?? undefined,
      publisher: element.getAttribute('data-host') ?? undefined,
      icon: element.querySelector('.js-unfurl-favicon img')?.getAttribute('src') ?? undefined,
      thumbnail: element.querySelector('.js-unfurl-figure img')?.getAttribute('src') ?? undefined,
    }
  },
}
