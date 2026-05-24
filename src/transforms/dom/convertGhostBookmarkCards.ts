import { upgradeProtocol } from 'feedcanon'
import { createWidgetPlaceholder, isSafeThumbnailUrl } from '../../common.js'
import type { DomTransform } from '../../types.js'

export const convertGhostBookmarkCards: DomTransform = () => {
  return (document) => {
    for (const card of document.querySelectorAll('.kg-bookmark-card')) {
      const link = card.querySelector('a.kg-bookmark-container')
      const href = link?.getAttribute('href')
      const title = card.querySelector('.kg-bookmark-title')?.textContent?.trim()

      if (!href || !title) {
        continue
      }

      const url = upgradeProtocol(href)
      const description = card.querySelector('.kg-bookmark-description')?.textContent?.trim()
      const author = card.querySelector('.kg-bookmark-author')?.textContent?.trim()
      const publisher = card.querySelector('.kg-bookmark-publisher')?.textContent?.trim()

      const iconSrc = card.querySelector('img.kg-bookmark-icon')?.getAttribute('src')
      const icon = iconSrc && isSafeThumbnailUrl(iconSrc) ? upgradeProtocol(iconSrc) : undefined

      const thumbnailSrc = card.querySelector('.kg-bookmark-thumbnail img')?.getAttribute('src')
      const thumbnail =
        thumbnailSrc && isSafeThumbnailUrl(thumbnailSrc) ? upgradeProtocol(thumbnailSrc) : undefined

      const fallback = document.createElement('a')
      fallback.setAttribute('href', url)
      fallback.textContent = title

      const placeholder = createWidgetPlaceholder(
        document,
        'bookmark',
        'ghost',
        { url, title, description, author, publisher, icon, thumbnail },
        fallback,
      )

      card.replaceWith(placeholder)
    }
  }
}
