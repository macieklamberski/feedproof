import type { BookmarkResolver } from '../types.js'

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

export const substackBookmarkResolver: BookmarkResolver = {
  selector: '.embedded-publication-wrap',
  extract: (element) => {
    const attrs = parsePublicationAttrs(element.getAttribute('data-attrs'))
    const url = attrs?.base_url
    const title = attrs?.name?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'substack',
      url,
      title,
      description: attrs.hero_text?.trim(),
      author: attrs.author_name?.trim(),
      icon: attrs.logo_url,
    }
  },
}
