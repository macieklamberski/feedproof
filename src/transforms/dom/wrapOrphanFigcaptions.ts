import type { DomTransform } from '../../types.js'
import { isElement } from '../../utils/dom.js'

const mediaSelector = 'img, picture, video, audio, iframe'

// The caption may sit inside a wrapper the publisher put it in, and it is that wrapper whose
// siblings say what the caption belongs to. Only a wrapper holding nothing else counts, so a
// caption buried in a container of mixed content is left alone.
const captionAnchor = (figcaption: Element): Element => {
  let anchor = figcaption

  while (anchor.parentElement && anchor.parentElement.children.length === 1) {
    const parent = anchor.parentElement

    if (parent.tagName.toLowerCase() === 'figure' || parent.tagName.toLowerCase() === 'body') {
      break
    }

    anchor = parent
  }

  return anchor
}

// Figures immediately before the caption, nearest first. They are what a caption placed after
// them describes.
const precedingFigures = (anchor: Element): Array<Element> => {
  const figures: Array<Element> = []

  for (
    let sibling = anchor.previousElementSibling;
    sibling && sibling.tagName.toLowerCase() === 'figure';
    sibling = sibling.previousElementSibling
  ) {
    figures.unshift(sibling)
  }

  return figures
}

// The caption is moved out of the wrapper it came in, and stripEmptyTags has already run by
// this point, so an emptied wrapper would be left behind for good.
const discardEmptyAnchor = (anchor: Element, figcaption: Element): void => {
  if (anchor !== figcaption && !anchor.textContent?.trim() && anchor.children.length === 0) {
    anchor.remove()
  }
}

// A caption can end up with nothing tying it to its images two ways: the feed publishes an
// image block and a bare <figcaption> with no <figure> at all, or it gives several images one
// shared caption, which then has to sit outside every figure it belongs to.
export const wrapOrphanFigcaptions: DomTransform = () => {
  return (document) => {
    const figcaptions = Array.from(document.querySelectorAll('figcaption'))

    for (const figcaption of figcaptions) {
      // A caption already inside a figure belongs to it, whatever the publisher wrapped it in
      // on the way down.
      if (figcaption.closest('figure')) {
        continue
      }

      const anchor = captionAnchor(figcaption)
      const parent = anchor.parentNode

      if (!parent) {
        continue
      }

      const figures = precedingFigures(anchor)

      if (figures.length === 1) {
        figures[0].appendChild(figcaption)
        discardEmptyAnchor(anchor, figcaption)
        continue
      }

      if (figures.length > 1) {
        const group = document.createElement('figure')

        parent.insertBefore(group, figures[0])

        for (const figure of figures) {
          group.appendChild(figure)
        }

        group.appendChild(figcaption)
        discardEmptyAnchor(anchor, figcaption)
        continue
      }

      const previous = anchor.previousElementSibling

      if (!previous || !isElement(previous)) {
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
