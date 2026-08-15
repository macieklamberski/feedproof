import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, hasText } from '../../utils/dom.js'

// note.com ships every embed as an empty <figure> that only its web client hydrates: the
// target URL sits in `data-src` and the provider name in `embedded-service`. The media
// services become plain iframes here in the normalize cluster, so the widget pass
// classifies each by its URL (YouTube through its resolver, the rest through the generic
// fallback). `external-article` figures belong to the cite pass and a `note` own-post figure
// to `notecomFigureEmbedResolver`, so both are left for their own pass and neither is touched
// here. That split follows the same boundary `convertAmpNativeElements` draws: generic
// recovery here, and a figure naming a platform to that platform's own resolver, which reads
// its attributes and mints the placeholder directly.
//
// This is an allowlist of services where note.com puts a directly embeddable URL in
// `data-src`, not a list of the services we recognise. Nothing in the markup says whether a
// `data-src` is a player URL or a page URL, and the two are indistinguishable by shape, so a
// service nobody has measured is left alone rather than framed. The obvious-looking change
// here is to iframe anything carrying an http URL: that would frame a full webpage, which
// looks resolved and renders either the whole page or an X-Frame-Options refusal.
//
// Any service outside the allowlist degrades to a plain link, so the reference stays
// reachable. Without it an unrecognised figure reaches a reader as an empty <figure> that
// renders nothing at all: it survives the pass rather than being stripped, because note.com
// writes a uuid into `name` and `id` and `stripEmptyTags` keeps anything carrying either, so
// the loss is silent in the output rather than visible in it.
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

    // A figure naming note.com itself belongs to `notecomFigureEmbedResolver`, which mints the
    // player from its id, so this pass leaves it for the widget pass to claim.
    if (service === 'note') {
      continue
    }

    // A figure already holding markup is showing the reader something, which is how an
    // `external-article` card arrives, so only an empty one is worth replacing.
    const isEmpty = !element.firstElementChild && !hasText(element)

    if (isEmpty) {
      const link = document.createElement('a')
      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
}
