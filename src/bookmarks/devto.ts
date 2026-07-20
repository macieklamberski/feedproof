import type { BookmarkResolver } from '../types.js'

// dev.to (Forem) turns a pasted link into an embed card. Forem compiles its liquid tags to
// HTML when the article is saved, so the card is already in the stored body by the time the
// feed renders, and the feed sanitizer's allowlist keeps `div`, `class` and `id` intact.
// The publisher sits as a bare text node next to the favicon, so it is read from the
// favicon's parent rather than from an element of its own.
export const devtoBookmarkResolver: BookmarkResolver = {
  selector: '.c-embed',
  extract: (element) => {
    const body = element.querySelector('.c-embed__body')
    const url =
      body?.querySelector('h2 a')?.getAttribute('href') ??
      element.querySelector('.c-embed__cover a')?.getAttribute('href') ??
      undefined
    const title = body?.querySelector('h2')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    const favicon = element.querySelector('img.c-embed__favicon')

    return {
      provider: 'devto',
      url,
      title,
      description: body?.querySelector('p')?.textContent ?? undefined,
      // The publisher is a bare text node beside the favicon image rather than an element
      // of its own, so it is read from the favicon's parent.
      publisher: favicon?.parentElement?.textContent ?? undefined,
      icon: favicon?.getAttribute('src') ?? undefined,
      thumbnail: element.querySelector('.c-embed__cover img')?.getAttribute('src') ?? undefined,
    }
  },
}
