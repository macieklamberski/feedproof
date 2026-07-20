import type { CiteResolver } from '../types.js'
import { attr } from '../utils/dom.js'

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

const parseData = (element: Element): EmbedlyData | undefined => {
  const raw = attr(element, 'data')

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

export const paragraphCiteResolver: CiteResolver = {
  selector: 'div[data-type="embedly"]',
  extract: (element) => {
    const data = parseData(element)

    if (!data) {
      return
    }

    // Embedly reuses this envelope for video and rich embeds, which are players rather
    // than link previews, so only a plain link becomes a cite.
    if (data.type !== undefined && data.type !== 'link') {
      return
    }

    // `url` is Embedly's canonical form; the `src` attribute holds what the author typed
    // and can differ (a bare http:// host, or an entirely different slug), so it is only
    // the fallback.
    const url = data.url ?? attr(element, 'src')
    const title = data.title?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'paragraph',
      url,
      title,
      description: data.description,
      author: data.author_name,
      publisher: data.provider_name,
      thumbnail: data.thumbnail_url,
    }
  },
}
