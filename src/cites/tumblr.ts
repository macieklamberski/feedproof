import type { CiteResolver } from '../types.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'

// Tumblr's NPF (Neue Post Format) link block renders to a bare anchor with the whole card
// alongside it in `data-npf`, as scraped Open Graph data. The visible markup carries only
// the link, so everything except the URL comes from the JSON.
//
// The URL is usually wrapped in one of Tumblr's outbound redirectors (`t.umblr.com/redirect`
// or `href.li`), sometimes nested. Unwrapping is left to the injected cleanUrlFn, which
// already handles wrappers and nesting.
type TumblrLinkData = {
  type?: string
  url?: string
  display_url?: string
  title?: string
  description?: string
  site_name?: string
  poster?: Array<{ url?: string }>
}

// Comparable form of a URL, or of anchor text showing one: Tumblr drops the scheme and may
// truncate with an ellipsis when it renders a link as its own label.
const urlScheme = /^https?:\/\//
const urlTail = /[…/]+$/

const bareUrl = (value: string): string => {
  return value.replace(urlScheme, '').replace(urlTail, '')
}

export const tumblrCiteResolver: CiteResolver = {
  selector: '.npf_link',
  extract: (element) => {
    const data = jsonAttr<TumblrLinkData>(element, 'data-npf')

    if (data?.type !== 'link') {
      return
    }

    const anchor = find(element, 'a')
    const url = data.url ?? attr(anchor, 'href')

    if (!url) {
      return
    }

    // The anchor repeats the title when there is one and shows the link itself when there is
    // not, so it only works as a fallback once it is checked against the link.
    const anchorText = text(anchor)
    const isLinkText =
      !!anchorText && bareUrl(data.display_url ?? url).startsWith(bareUrl(anchorText))
    const title = data.title?.trim() || (isLinkText ? undefined : anchorText)

    if (!title) {
      return
    }

    return {
      provider: 'tumblr',
      url,
      title,
      description: data.description?.trim(),
      publisher: data.site_name?.trim(),
      // Recent posts describe the poster by `media_key` only, with no URL to resolve it to;
      // older ones carry a real one.
      thumbnail: data.poster?.find((poster) => poster.url)?.url,
    }
  },
}
