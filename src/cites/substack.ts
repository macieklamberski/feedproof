import type { CiteResolver } from '../types.js'
import { jsonAttr } from '../utils/dom.js'

// Substack's two post-embed shapes are separate components, not generations of one:
// today's editor emits `.embedded-post-wrap` when embedding another creator's post and
// `.digest-post-embed` when embedding the publication's own post (verified 2026-07 at
// 100% separation across 235 dated live embeds; the two key sets are disjoint across
// 4,078 corpus specimens with zero mixed blobs). Both carry their card data in the
// `data-attrs` JSON and are rendered client-side on Substack itself.
type CrossPostAttrs = {
  title?: string
  url?: string
  truncated_body_text?: string
  cover_image?: string
  publication_name?: string
  publication_logo_url?: string
  bylines?: Array<{ name?: string }>
  date?: string
}

type OwnPostAttrs = {
  title?: string
  canonical_url?: string
  caption?: string
  cover_image?: string
  publication_name?: string
  publication_logo_url?: string
  publishedBylines?: Array<{ name?: string }>
  post_date?: string
}

// An embed of another creator's post. On Substack it renders as the tall branded card
// (publication logo header, body preview, a Read more button, engagement counts),
// because the reader may not know the linked publication.
export const substackCrossPostCiteResolver: CiteResolver = {
  selector: '.embedded-post-wrap',
  extract: (element) => {
    const attrs = jsonAttr<CrossPostAttrs>(element, 'data-attrs')

    if (!attrs) {
      return
    }

    const url = attrs.url
    const title = attrs.title?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'substack',
      url,
      title,
      description: attrs.truncated_body_text,
      author: attrs.bylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    }
  },
}

// An embed of the publication's own post: the compact card behind Substack's digest and
// "in case you missed it" flows (the March 2023 feature the class name comes from), and
// also what a single self-post embed produces today. Ships as an empty hydration div.
// The `caption` is the linked post's excerpt and the only preview text the div carries,
// so it maps to the description.
export const substackOwnPostCiteResolver: CiteResolver = {
  selector: '.digest-post-embed',
  extract: (element) => {
    const attrs = jsonAttr<OwnPostAttrs>(element, 'data-attrs')

    if (!attrs) {
      return
    }

    const url = attrs.canonical_url
    const title = attrs.title?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'substack',
      url,
      title,
      description: attrs.caption,
      author: attrs.publishedBylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.post_date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    }
  },
}
