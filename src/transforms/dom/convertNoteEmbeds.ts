import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'

// note.com ships every embed as an empty <figure> that only its web client hydrates: the
// target URL sits in `data-src` and the provider name in `embedded-service`. The media
// services become plain iframes here in the normalize cluster, so the widget pass
// classifies each by its URL (YouTube through its resolver, the rest through the generic
// fallback). A `note` own-post embed carries nothing but the post URL, so it becomes a
// plain link and the reference stays reachable. `external-article` figures belong to the
// cite pass and the social figures ship no widget kind yet, so both stay untouched.
const iframeServices = new Set(['youtube', 'spotify', 'oembed'])

export const convertNoteEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('figure[embedded-service][data-src]')) {
    const service = attr(element, 'embedded-service')
    const source = attr(element, 'data-src')

    if (!service || !source || !startsWithAnyOf(source, ['http://', 'https://'])) {
      continue
    }

    if (iframeServices.has(service)) {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('src', source)
      element.replaceWith(iframe)
    } else if (service === 'note') {
      const link = document.createElement('a')
      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
}
