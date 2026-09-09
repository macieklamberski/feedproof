import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'

const proxySelector = 'iframe[src*="/media/oembed?"]'

// Drupal's /media/oembed frame around a remote video, naming the site rather than the provider,
// so the placeholder gets no poster, no shape and no provider.
// The query is `url={page url}&max_width=0&max_height=0&hash=…`, and the hash is tied to the
// site.
export const unwrapDrupalOembedIframes: DomTransform = () => (document) => {
  for (const iframe of document.querySelectorAll(proxySelector)) {
    const query = attr(iframe, 'src')?.split('?')[1] ?? ''
    const url = new URLSearchParams(query).get('url')

    // Requiring a scheme here drops protocol-relative and site-relative urls later passes resolve.
    if (!url || !isUrlShaped(url)) {
      continue
    }

    iframe.setAttribute('src', url)
  }
}
