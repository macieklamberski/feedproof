import type { DomTransform } from '../../types.js'
import { createIframe } from '../../utils/widgets.js'

// Embed Plus for YouTube ships a poster-only facade div and builds the iframe with JS on click.
export const rebuildEmbedPlusEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('.epyt-facade[data-facadesrc]')) {
    const src = element.getAttribute('data-facadesrc')

    if (!src) {
      continue
    }

    const iframe = createIframe(document, src)

    // The .epyt-facade-poster img is the publisher's own maxres YouTube thumbnail.
    const poster = element.querySelector('.epyt-facade-poster')?.getAttribute('src')

    if (poster) {
      iframe.setAttribute('data-thumbnail', poster)
    }

    element.replaceWith(iframe)
  }
}
