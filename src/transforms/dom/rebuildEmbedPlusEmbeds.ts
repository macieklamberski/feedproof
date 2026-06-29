import type { DomTransform } from '../../types.js'

// The "Embed Plus for YouTube" plugin renders a `.epyt-facade` div that holds the ready embed
// URL in `data-facadesrc` and only builds the iframe with JS at runtime, so a reader (which runs
// no JS) only ever shows the poster image. Promote `data-facadesrc` back to a real <iframe>; the
// YouTube resolver downstream recovers the id and thumbnail.
export const rebuildEmbedPlusEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('.epyt-facade[data-facadesrc]')) {
    const src = element.getAttribute('data-facadesrc')

    if (!src) {
      continue
    }

    const iframe = document.createElement('iframe')

    iframe.setAttribute('src', src)

    // The facade ships the publisher's real poster (a maxres YouTube thumbnail). Carry it on
    // the iframe so replaceEmbedsWithPlaceholders uses it instead of the resolver's hqdefault.
    const poster = element.querySelector('.epyt-facade-poster')?.getAttribute('src')

    if (poster) {
      iframe.setAttribute('data-thumbnail', poster)
    }

    element.replaceWith(iframe)
  }
}
