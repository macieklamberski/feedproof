import type { CiteResolver } from '../types.js'

export const ghostCiteResolver: CiteResolver = {
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
      // Ghost's renderer intentionally reverses these two classes for theme
      // backwards-compatibility: .kg-bookmark-author holds the publisher name and
      // .kg-bookmark-publisher holds the author name. Ghost's own note about it:
      // https://github.com/TryGhost/Ghost/blob/6e15b9d5bcceffcfef78e488f30692ce370ba928/koenig/kg-default-nodes/src/nodes/bookmark/bookmark-renderer.ts#L168
      author: element.querySelector('.kg-bookmark-publisher')?.textContent ?? undefined,
      publisher: element.querySelector('.kg-bookmark-author')?.textContent ?? undefined,
      caption: element.querySelector('figcaption')?.textContent ?? undefined,
      icon: element.querySelector('img.kg-bookmark-icon')?.getAttribute('src') ?? undefined,
      thumbnail:
        element.querySelector('.kg-bookmark-thumbnail img')?.getAttribute('src') ?? undefined,
    }
  },
}
