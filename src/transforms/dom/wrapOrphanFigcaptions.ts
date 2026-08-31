import type { DomTransform } from '../../types.js'

const mediaSelector = 'img, picture, video, audio, iframe'

// Some feeds publish a captioned image as a block holding the image followed by a bare
// <figcaption>, with no <figure> anywhere, so the caption renders as body text a full
// paragraph's gap from what it describes.
//
// A <figure> is never adopted: a caption after one or more figures is a shared caption
// for the group, and pulling it into the last one would credit the wrong image.
export const wrapOrphanFigcaptions: DomTransform = () => {
  return (document) => {
    const figcaptions = Array.from(document.querySelectorAll('figcaption'))

    for (const figcaption of figcaptions) {
      const parent = figcaption.parentNode

      if (!parent || figcaption.parentElement?.tagName.toLowerCase() === 'figure') {
        continue
      }

      const previous = figcaption.previousElementSibling

      if (!previous || previous.tagName.toLowerCase() === 'figure') {
        continue
      }

      if (previous.querySelectorAll(mediaSelector).length !== 1) {
        continue
      }

      if (previous.textContent?.trim()) {
        continue
      }

      const figure = document.createElement('figure')

      parent.insertBefore(figure, previous)
      figure.appendChild(previous)
      figure.appendChild(figcaption)
    }
  }
}
