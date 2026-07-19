import type { BookmarkResolver } from '../types.js'

// SWELL, a widely used WordPress theme, renders its post-link block as a card. Unlike
// Cocoon the URL sits on the title anchor rather than on a wrapping element. Internal
// and external cards get the same treatment; the theme's own caption ("recommended
// reading" and similar) is dropped, since the card carries the link on its own.
export const swellBookmarkResolver: BookmarkResolver = {
  selector: '.p-blogCard',
  extract: (element) => {
    const link = element.querySelector('a.p-blogCard__title')
    const url = link?.getAttribute('href') ?? undefined
    const title = link?.textContent?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'swell',
      url,
      title,
      description: element.querySelector('.p-blogCard__excerpt')?.textContent ?? undefined,
      thumbnail: element.querySelector('.p-blogCard__thumb img')?.getAttribute('src') ?? undefined,
    }
  },
}
