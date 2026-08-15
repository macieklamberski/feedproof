import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, hasText } from '../../utils/dom.js'

// note.com ships every embed as an empty <figure> that only its web client hydrates: the
// target URL sits in `data-src` and the provider name in `embedded-service`. The media
// services become plain iframes here in the normalize cluster, so the widget pass
// classifies each by its URL (YouTube through its resolver, the rest through the generic
// fallback). A `note` own-post embed carries nothing but the post URL, so it becomes a
// plain link and the reference stays reachable. `external-article` figures belong to the
// cite pass.
//
// Any other service degrades to the same plain link. The service list is note.com's, not
// ours, so it grows without warning, and an unrecognised figure otherwise reaches a reader
// as an empty `<figure>` that renders nothing at all. It survives the pass rather than being
// stripped, because note.com writes a uuid into `name` and `id` and `stripEmptyTags` keeps
// anything carrying either, so the loss is silent in the output rather than visible in it.
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

      continue
    }

    // A figure already holding markup is showing the reader something, which is how an
    // `external-article` card arrives, so only an empty one is worth replacing.
    const isEmpty = !element.firstElementChild && !hasText(element)

    if (service === 'note' || isEmpty) {
      const link = document.createElement('a')
      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
}
