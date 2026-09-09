import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'

type CrossPostAttrs = {
  title?: string
  url?: string
  truncated_body_text?: string
  cover_image?: string
  publication_name?: string
  publication_logo_url?: string
  bylines?: Array<{ name?: string; photo_url?: string }>
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

// Substack's embed of another creator's post: an empty div its client hydrates from JSON.
export const substackCrossPostCiteResolver: CiteResolver = {
  kind: 'cite',
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
      icon: attrs.publication_logo_url ?? attrs.bylines?.[0]?.photo_url,
      thumbnail: attrs.cover_image,
    })
  },
}

// Substack's embed of the publication's own post: an empty hydration div, or hydrated on its site.
export const substackOwnPostCiteResolver: CiteResolver = {
  kind: 'cite',
  // On Substack's own site the class is build-hashed, digestPostEmbed-flwiST, and reader
  // extraction drops classes.
  selector: '.digest-post-embed, [data-component-name="DigestPostEmbed"]',
  extract: (element) => {
    const attrs = jsonAttr<OwnPostAttrs>(element, 'data-attrs')

    if (!attrs) {
      return buildCite({
        provider: 'substack',
        // The card's own anchor comes first. The byline anchor below it points at the
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
      // `caption` is the linked post's excerpt, the only preview text the blob carries.
      description: attrs.caption,
      author: attrs.publishedBylines?.[0]?.name,
      publisher: attrs.publication_name,
      date: attrs.post_date,
      icon: attrs.publication_logo_url,
      thumbnail: attrs.cover_image,
    })
  },
}

// Substack's Embed button card for other sites: three paragraphs and a link its SDK restyles.
export const substackPostEmbedCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: 'div.substack-post-embed',
  extract: (element) => {
    const paragraphs = element.querySelectorAll('p')

    return buildCite({
      provider: 'substack',
      // A host check would drop custom-domain publications, which still serve the /p/{slug} path.
      url: attr(find(element, 'a[data-post-link]'), 'href'),
      // Splitting on " by " to lift the author corrupts every title containing the word.
      // The first paragraph is the title, sometimes with the author appended as `Title by Author`,
      // and the second is the post's subtitle.
      title: text(paragraphs[0]),
      description: text(paragraphs[1]),
    })
  },
}

type PublicationAttrs = {
  name?: string
  base_url?: string
  hero_text?: string
  author_name?: string
  logo_url?: string
}

// Substack's card for a whole publication: a childless div in feeds, hydrated on its own site.
// Its data-attrs carries no description or hero_image. Nothing in either shape separates a card
// the author introduced from one Substack injected.
export const substackPublicationCiteResolver: CiteResolver = {
  kind: 'cite',
  selector:
    '.embedded-publication-wrap, [data-component-name="EmbeddedPublicationToDOMWithSubscribe"]',
  extract: (element) => {
    const attrs = jsonAttr<PublicationAttrs>(element, 'data-attrs')

    return buildCite({
      provider: 'substack',
      // On Substack's own site the blob omits base_url and the anchor carries the url.
      url: attrs?.base_url ?? attr(find(element, 'a.embedded-publication-link-part'), 'href'),
      title: attrs?.name ?? text(find(element, '.embedded-publication-name')),
      description: attrs?.hero_text ?? text(find(element, '.embedded-publication-hero-text')),
      author: attrs?.author_name,
      icon: attrs?.logo_url ?? attr(find(element, 'img.embedded-publication-logo'), 'src'),
    })
  },
}
