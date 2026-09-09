import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'
import * as styles from '../utils/styles.js'

type TumblrLinkData = {
  type?: string
  url?: string
  display_url?: string
  title?: string
  description?: string
  author?: string
  site_name?: string
  poster?: Array<{ url?: string }>
}

// Comparable form of a URL, or of anchor text showing one: Tumblr drops the scheme and may
// truncate with an ellipsis when it renders a link as its own label.
const urlScheme = /^https?:\/\//
const urlTail = /[…/]+$/ // Trailing ellipsis (U+2026) or slash characters

const bareUrl = (value: string): string => {
  return value.replace(urlScheme, '').replace(urlTail, '')
}

// Tumblr's NPF link block: a bare anchor with the card as JSON, or a painted card, poster in CSS.
// The url is usually wrapped in t.umblr.com/redirect or href.li, sometimes nested.
export const tumblrCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.npf_link, .npf-link-block',
  extract: (element) => {
    if (element.matches('.npf-link-block')) {
      return buildCite({
        provider: 'tumblr',
        url: attr(find(element, 'a'), 'href'),
        title: text(element, '.title'),
        description: text(element, '.description'),
        publisher: text(element, '.site-name'),
        thumbnail: styles.bgImage(find(element, '.poster')),
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
      // The anchor shows the link itself when there is no title, so without the check that link
      // text becomes the title.
      title: data.title?.trim() || (isLinkText ? undefined : anchorText),
      description: data.description,
      author: data.author,
      publisher: data.site_name,
      // Recent posts list posters by media_key only, so the first entry can carry no url.
      thumbnail: data.poster?.find((poster) => poster.url)?.url,
    })
  },
}
