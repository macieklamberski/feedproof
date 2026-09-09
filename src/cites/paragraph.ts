import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, jsonAttr } from '../utils/dom.js'

type EmbedlyData = {
  type?: string
  title?: string
  url?: string
  description?: string
  thumbnail_url?: string
  provider_name?: string
  author_name?: string
}

// Paragraph's link card: a div its client renders from the Embedly JSON blob the div carries.
// The inner DOM has shipped as an older .twitter-summary and today's .link-embed, and the JSON
// keys are Embedly's.
export const paragraphCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: 'div[data-type="embedly"]',
  extract: (element) => {
    const data = jsonAttr<EmbedlyData>(element, 'data')

    if (!data) {
      return
    }

    // Older cards omit the type, so requiring 'link' drops them.
    // Embedly reuses the envelope for video and rich embeds, which are players.
    if (data.type !== undefined && data.type !== 'link') {
      return
    }

    return buildCite({
      provider: 'paragraph',
      // src is what the author typed, a bare host or another slug, so it is only the fallback.
      url: data.url ?? attr(element, 'src'),
      title: data.title,
      description: data.description,
      author: data.author_name,
      publisher: data.provider_name,
      thumbnail: data.thumbnail_url,
    })
  },
}
