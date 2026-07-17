import type { BookmarkResolver } from '../types.js'

export const ghostBookmarkResolver: BookmarkResolver = {
  selector: '.kg-bookmark-card',
  extract: (element) => {
    const link = element.querySelector('a.kg-bookmark-container')
    const url = link?.getAttribute('href') ?? undefined
    const title = element.querySelector('.kg-bookmark-title')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'ghost',
      url,
      title,
      description: element.querySelector('.kg-bookmark-description')?.textContent ?? undefined,
      author: element.querySelector('.kg-bookmark-author')?.textContent ?? undefined,
      publisher: element.querySelector('.kg-bookmark-publisher')?.textContent ?? undefined,
      icon: element.querySelector('img.kg-bookmark-icon')?.getAttribute('src') ?? undefined,
      thumbnail:
        element.querySelector('.kg-bookmark-thumbnail img')?.getAttribute('src') ?? undefined,
    }
  },
}
