import type { DomTransform } from '../../types.js'
import { createIframe } from '../../utils/widgets.js'

// The "Embed Plus for YouTube" plugin renders a `.epyt-facade` div that holds the ready embed
// URL in `data-facadesrc` and only builds the iframe with JS at runtime, so a reader (which runs
// no JS) only ever shows the poster image. Promote `data-facadesrc` back to a real <iframe>. The
// YouTube resolver downstream recovers the id and thumbnail.
export const rebuildEmbedPlusEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('.epyt-facade[data-facadesrc]')) {
    const src = element.getAttribute('data-facadesrc')

    if (!src) {
      continue
    }

    const iframe = createIframe(document, src)

    // The facade ships the publisher's real poster (a maxres YouTube thumbnail). Carry it on
    // the iframe so convertWidgets uses it instead of the resolver's hqdefault.
    const poster = element.querySelector('.epyt-facade-poster')?.getAttribute('src')

    if (poster) {
      iframe.setAttribute('data-thumbnail', poster)
    }

    element.replaceWith(iframe)
  }
}
