import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'
import { createLinkedImage } from '../../utils/widgets.js'

// `giphy.com/embed/{id}`, the media host spelling `media.giphy.com/media/{id}/giphy.gif` that
// some feeds put in an iframe instead, and the `giphy.com/gifs/{id}` page url.
const giphyIdRegex = /giphy\.com\/(?:embed|media|gifs)\/([A-Za-z0-9]+)/

// A Giphy gif shipped as an iframe, a third-party frame around a file that animates in an <img>.
export const convertGiphyEmbeds: DomTransform = () => (document) => {
  for (const iframe of document.querySelectorAll('iframe[src*="giphy.com/"]')) {
    const gifId = attr(iframe, 'src')?.match(giphyIdRegex)?.[1]

    if (!gifId) {
      continue
    }

    // Giphy serves every gif at media.giphy.com/media/{id}/giphy.gif, derivable from the id
    // alone, and an invented id answers 404.
    const image = createLinkedImage(document, {
      src: `https://media.giphy.com/media/${gifId}/giphy.gif`,
      href: `https://giphy.com/gifs/${gifId}`,
      alt: attr(iframe, 'title'),
    })

    iframe.replaceWith(image)
  }
}
