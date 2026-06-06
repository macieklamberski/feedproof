import type { DomTransform } from '../../types.js'

// Some feeds wrap a figure's entire content in a single click-through anchor, so
// the <figcaption> ends up inside the link alongside the media. That makes the
// whole caption a click target and folds its text into the link's accessible
// name. This moves the caption out to sit right after the anchor, still inside
// the figure, leaving the click-through on the media alone.
export const hoistFigcaptionFromAnchor: DomTransform = () => {
  return (document) => {
    const figcaptions = document.querySelectorAll('figure > a > figcaption')

    for (const figcaption of figcaptions) {
      const anchor = figcaption.parentNode
      const figure = anchor?.parentNode

      if (!anchor || !figure) {
        continue
      }

      figure.insertBefore(figcaption, anchor.nextSibling)
    }
  }
}
