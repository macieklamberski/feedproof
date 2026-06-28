import type { DomTransform } from '../../types.js'

// WP Rocket's "Replace YouTube iframe with preview image" rewrites the real iframe into a
// `.rll-youtube-player` preview div that holds the embed URL in `data-src` and only builds
// the iframe with JS on click, so a reader (which runs no JS) never shows the video. Promote
// `data-src` back to a real <iframe>; the YouTube resolver downstream recovers the id and
// thumbnail.
export const rebuildRocketYoutubePreviews: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div.rll-youtube-player[data-src]')) {
    const src = element.getAttribute('data-src')

    if (!src) {
      continue
    }

    const query = element.getAttribute('data-query')
    const iframe = document.createElement('iframe')

    iframe.setAttribute('src', query ? `${src}?${query}` : src)
    element.replaceWith(iframe)
  }
}
