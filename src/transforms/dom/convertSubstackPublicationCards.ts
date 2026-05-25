import { upgradeProtocol } from 'feedcanon'
import { createWidgetPlaceholder, isSafeThumbnailUrl } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Substack serializes the publication's metadata into the `data-attrs` JSON blob.
type PublicationAttrs = {
  name?: string
  base_url?: string
  logo_url?: string
  hero_text?: string
  author_name?: string
}

const parsePublicationAttrs = (raw: string | null): PublicationAttrs | undefined => {
  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

export const convertSubstackPublicationCards: DomTransform = () => {
  return (document) => {
    for (const card of document.querySelectorAll('.embedded-publication-wrap')) {
      const attrs = parsePublicationAttrs(card.getAttribute('data-attrs'))
      const href = attrs?.base_url
      const title = attrs?.name?.trim()

      if (!href || !title) {
        continue
      }

      const url = upgradeProtocol(href)
      const description = attrs.hero_text?.trim()
      const author = attrs.author_name?.trim()

      const iconSrc = attrs.logo_url
      const icon = iconSrc && isSafeThumbnailUrl(iconSrc) ? upgradeProtocol(iconSrc) : undefined

      const fallback = document.createElement('a')
      fallback.setAttribute('href', url)
      fallback.textContent = title

      const placeholder = createWidgetPlaceholder(
        document,
        'bookmark',
        'substack',
        { url, title, description, author, icon },
        fallback,
      )

      card.replaceWith(placeholder)
    }
  }
}
