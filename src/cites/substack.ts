import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'

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

    return buildCite({
      provider: 'substack',
      url: attrs.url,
      title: attrs.title,
      description: attrs.truncated_body_text,
      author: attrs.bylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    })
  },
}

// An embed of the publication's own post: the compact card behind Substack's digest and
// "in case you missed it" flows (the March 2023 feature the class name comes from), and
// also what a single self-post embed produces today. In a feed it ships as an empty
// hydration div, where the `caption` is the linked post's excerpt and the only preview text
// available, so it maps to the description.
//
// Substack's own site ships the same card hydrated instead, which is what a reader-mode
// fetch of the post page sees. Its class is build-hashed there (`digestPostEmbed-flwiST`)
// and reader extraction drops classes anyway, so the second arm matches the component name
// and reads every field out of the markup. That shape carries no preview text or publication
// branding, and dates it long-form ("October 5, 2025") rather than as the ISO string
// `data-cite-date` holds, so those fields stay empty.
export const substackOwnPostCiteResolver: CiteResolver = {
  selector: '.digest-post-embed, [data-component-name="DigestPostEmbed"]',
  extract: (element) => {
    const attrs = jsonAttr<OwnPostAttrs>(element, 'data-attrs')

    if (!attrs) {
      return buildCite({
        provider: 'substack',
        // The card's own anchor comes first; the byline anchor below it points at the
        // author's Substack profile, on custom domains too.
        url: attr(find(element, 'a[href]'), 'href'),
        title: text(element, 'h4'),
        author: text(find(element, 'a[href*="substack.com/profile/"]')),
        thumbnail: attr(find(element, 'img'), 'src'),
      })
    }

    return buildCite({
      provider: 'substack',
      url: attrs.canonical_url,
      title: attrs.title,
      description: attrs.caption,
      author: attrs.publishedBylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.post_date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    })
  },
}
