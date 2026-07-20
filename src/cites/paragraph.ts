import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, jsonAttr } from '../utils/dom.js'

// Paragraph renders the card client-side but also ships the whole payload as an oEmbed
// JSON blob in `data`, which is richer and steadier than the rendered markup: the inner
// DOM has changed shape at least once (an older `.twitter-summary` variant alongside
// today's `.link-embed`), while the JSON keys are Embedly's and stayed put.
type EmbedlyData = {
  type?: string
  title?: string
  url?: string
  description?: string
  thumbnail_url?: string
  provider_name?: string
  author_name?: string
}

export const paragraphCiteResolver: CiteResolver = {
  selector: 'div[data-type="embedly"]',
  extract: (element) => {
    const data = jsonAttr<EmbedlyData>(element, 'data')

    if (!data) {
      return
    }

    // Embedly reuses this envelope for video and rich embeds, which are players rather
    // than link previews, so only a plain link becomes a cite.
    if (data.type !== undefined && data.type !== 'link') {
      return
    }

    return buildCite({
      provider: 'paragraph',
      // `url` is Embedly's canonical form; the `src` attribute holds what the author typed
      // and can differ (a bare http:// host, or an entirely different slug), so it is only
      // the fallback.
      url: data.url ?? attr(element, 'src'),
      title: data.title,
      description: data.description,
      author: data.author_name,
      publisher: data.provider_name,
      thumbnail: data.thumbnail_url,
    })
  },
}
