import type { BookmarkResolver } from '../types.js'

// Substack serializes the publication's metadata into the `data-attrs` JSON blob.
type PublicationAttrs = {
  name?: string
  base_url?: string
  logo_url?: string
  hero_text?: string
  author_name?: string
}

const parseDataAttrs = <Attrs>(raw: string | null): Attrs | undefined => {
  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

// Substack post embeds come in two shapes: `.embedded-post-wrap` for a post embedded in
// another post, and `.digest-post-embed` for posts referenced in digest roundups. Both are
// empty divs whose card data lives in the `data-attrs` JSON; Substack renders them
// client-side. The digest shape also carries a `caption`, but that text is the digest
// author's commentary and appears again as regular body text, so it is not used here.
type PostAttrs = {
  title?: string
  url?: string
  canonical_url?: string
  truncated_body_text?: string
  cover_image?: string
  publication_name?: string
  publication_logo_url?: string
  publishedBylines?: Array<{ name?: string }>
  post_date?: string
  date?: string
}

export const substackPostBookmarkResolver: BookmarkResolver = {
  selector: '.embedded-post-wrap, .digest-post-embed',
  extract: (element) => {
    const attrs = parseDataAttrs<PostAttrs>(element.getAttribute('data-attrs'))

    if (!attrs) {
      return
    }

    const url = attrs.canonical_url ?? attrs.url
    const title = attrs.title?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'substack',
      url,
      title,
      description: attrs.truncated_body_text,
      author: attrs.publishedBylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.post_date ?? attrs.date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    }
  },
}

export const substackBookmarkResolver: BookmarkResolver = {
  selector: '.embedded-publication-wrap',
  extract: (element) => {
    const attrs = parseDataAttrs<PublicationAttrs>(element.getAttribute('data-attrs'))
    const url = attrs?.base_url
    const title = attrs?.name?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'substack',
      url,
      title,
      description: attrs.hero_text,
      author: attrs.author_name,
      icon: attrs.logo_url,
    }
  },
}
