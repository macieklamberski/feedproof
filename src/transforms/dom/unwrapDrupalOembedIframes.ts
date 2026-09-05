import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'

// Drupal's media module frames a remote video through the site's own oEmbed route,
// `/media/oembed?url={page url}&max_width=0&max_height=0&hash=…`, which renders the provider's
// player inside a frame served by the site. The frame plays, but it names the site rather than
// the provider, so the placeholder gets no poster, no shape and no provider, and the hash ties
// the url to that one site's settings. The page url in `url` is what the provider resolvers
// read, so the iframe is pointed at it and keeps everything else it declared.
const proxySelector = 'iframe[src*="/media/oembed?"]'

export const unwrapDrupalOembedIframes: DomTransform = () => (document) => {
  for (const iframe of document.querySelectorAll(proxySelector)) {
    const query = attr(iframe, 'src')?.split('?')[1] ?? ''
    const url = new URLSearchParams(query).get('url')

    if (!url || !startsWithAnyOf(url, ['http://', 'https://'])) {
      continue
    }

    iframe.setAttribute('src', url)
  }
}
