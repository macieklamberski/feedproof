import type { DomTransform } from '../../types.js'

// A figure wrapped whole in a click-through anchor, so the <figcaption> is part of the link:
// the whole caption is a click target and its text folds into the link's accessible name.
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
