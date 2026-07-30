import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, bgImage, find, jsonAttr, text } from '../utils/dom.js'

// Tumblr's NPF (Neue Post Format) link block reaches feeds in two shapes. `.npf_link` is a
// bare anchor with the whole card alongside it in `data-npf`, as scraped Open Graph data;
// the visible markup carries only the link, so everything except the URL comes from the
// JSON. `.npf-link-block` is the card painted as markup instead, with the poster as a CSS
// `background-image` rather than an `<img>`.
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
  selector: '.npf_link, .npf-link-block',
  extract: (element) => {
    if (element.matches('.npf-link-block')) {
      return buildCite({
        provider: 'tumblr',
        url: attr(find(element, 'a'), 'href'),
        title: text(element, '.title'),
        description: text(element, '.description'),
        publisher: text(element, '.site-name'),
        thumbnail: bgImage(find(element, '.poster')),
      })
    }

    const data = jsonAttr<TumblrLinkData>(element, 'data-npf')

    if (data?.type !== 'link') {
      return
    }

    const anchor = find(element, 'a')
    const url = data.url?.trim() || attr(anchor, 'href')

    // The anchor repeats the title when there is one and shows the link itself when there is
    // not, so it only works as a fallback once it is checked against the link.
    const anchorText = text(anchor)
    const isLinkText =
      !!url && !!anchorText && bareUrl(data.display_url ?? url).startsWith(bareUrl(anchorText))

    return buildCite({
      provider: 'tumblr',
      url,
      title: data.title?.trim() || (isLinkText ? undefined : anchorText),
      description: data.description,
      publisher: data.site_name,
      // Recent posts describe the poster by `media_key` only, with no URL to resolve it to;
      // older ones carry a real one.
      thumbnail: data.poster?.find((poster) => poster.url)?.url,
    })
  },
}
