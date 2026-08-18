import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'

// `giphy.com/embed/{id}`, the media host spelling `media.giphy.com/media/{id}/giphy.gif` that
// some feeds put in an iframe instead, and the `giphy.com/gifs/{id}` page url.
const giphyIdRegex = /giphy\.com\/(?:embed|media|gifs)\/([A-Za-z0-9]+)/

// Giphy publishes every gif as a plain file derivable from the id alone, and a gif animates in
// an <img> with no script at all. So the iframe buys nothing a reader wants: it costs a
// third-party frame, and it hides the image from the dimension, proxy and enclosure passes that
// treat every other image in the document. Emit a linked <img> instead.
//
// Verified 2026-08-11: `media.giphy.com/media/{id}/giphy.gif` answers 200 image/gif for a real
// id and 404 for an invented one, so unlike most player hosts this derivation is checkable.
const buildGifImage = (document: Document, gifId: string, alt: string | undefined): HTMLElement => {
  const image = document.createElement('img')
  image.setAttribute('src', `https://media.giphy.com/media/${gifId}/giphy.gif`)

  if (alt) {
    image.setAttribute('alt', alt)
  }

  const link = document.createElement('a')
  link.setAttribute('href', `https://giphy.com/gifs/${gifId}`)
  link.appendChild(image)

  return link
}

// The positioned div Giphy wraps its iframe in is left alone on purpose. It carries the aspect
// padding, which is meaningless once the gif is an image that states its own size, but
// unwrapWrappers dissolves a sole-child wrapper later in the pipeline and does it better.
export const convertGiphyEmbeds: DomTransform = () => (document) => {
  for (const iframe of document.querySelectorAll('iframe[src*="giphy.com/"]')) {
    const gifId = attr(iframe, 'src')?.match(giphyIdRegex)?.[1]

    if (!gifId) {
      continue
    }

    iframe.replaceWith(buildGifImage(document, gifId, attr(iframe, 'title')))
  }
}
