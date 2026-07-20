import type { CiteResolver } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// Tumblr's NPF (Neue Post Format) link block renders to a bare anchor with the whole card
// alongside it in `data-npf`, as scraped Open Graph data. The visible markup carries only
// the link, so everything except the URL comes from the JSON.
type TumblrLinkData = {
  type?: string
  url?: string
  title?: string
  description?: string
  site_name?: string
  poster?: Array<{ url?: string }>
}

const parseNpf = (element: Element): TumblrLinkData | undefined => {
  const raw = attr(element, 'data-npf')

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

// Tumblr routes external links through two different redirectors, and the JSON `url` is
// wrapped in whichever was current when the post was written. Both have to be unwrapped or
// every cite points at the redirector instead of the page.
const hrefLiMarker = 'href.li/?'
const redirectMarker = 't.umblr.com/redirect?'

const unwrapRedirect = (url: string): string => {
  const hrefLiIndex = url.indexOf(hrefLiMarker)

  if (hrefLiIndex !== -1) {
    return url.slice(hrefLiIndex + hrefLiMarker.length)
  }

  const redirectIndex = url.indexOf(redirectMarker)

  if (redirectIndex !== -1) {
    const query = url.slice(redirectIndex + redirectMarker.length)
    // The target rides the `z` param percent-encoded, so it needs decoding rather than
    // just stripping the prefix.
    const target = new URLSearchParams(query).get('z')

    if (target) {
      return target
    }
  }

  return url
}

export const tumblrCiteResolver: CiteResolver = {
  selector: '.npf_link',
  extract: (element) => {
    const data = parseNpf(element)

    if (!data || (data.type !== undefined && data.type !== 'link')) {
      return
    }

    const anchor = find(element, 'a')
    const rawUrl = data.url ?? attr(anchor, 'href')

    if (!rawUrl) {
      return
    }

    // The anchor text repeats the title when there is one and shows the raw URL when there
    // is not, so it only works as a fallback once a URL-looking value is rejected.
    const anchorText = text(anchor)
    const fallbackTitle = anchorText?.startsWith('http') ? undefined : anchorText
    const title = data.title?.trim() || fallbackTitle

    if (!title) {
      return
    }

    return {
      provider: 'tumblr',
      url: unwrapRedirect(rawUrl),
      title,
      description: data.description,
      publisher: data.site_name,
      // Recent posts describe the poster by `media_key` only, with no URL to resolve it to;
      // older ones carry a real one.
      thumbnail: data.poster?.find((poster) => poster.url)?.url,
    }
  },
}
