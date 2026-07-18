import type { BookmarkResolver } from '../types.js'

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
  bylines?: Array<{ name?: string }>
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
      // Older post embeds carry the byline under `bylines`, newer ones under
      // `publishedBylines`; both appear in live feeds.
      author: attrs.publishedBylines?.[0]?.name ?? attrs.bylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.post_date ?? attrs.date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    }
  },
}
