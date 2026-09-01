import type { DomTransform } from '../../types.js'

const nonTextSelector =
  'img, picture, video, audio, iframe, figure, figcaption, [data-embed-provider], [data-cite-provider]'

const isCaptionText = (element: Element): boolean => {
  if (element.matches(nonTextSelector) || element.querySelector(nonTextSelector)) {
    return false
  }

  return Boolean(element.textContent?.trim())
}

// A figcaption nested in a wrapper beside text-only blocks means the wrapper is the whole
// caption: Big Think writes the image description in site-classed divs with only the credit
// line in the figcaption, so stripped of classes the description reads as body prose. Runs
// before unwrapWrappers, which dissolves the wrapper and with it the grouping evidence.
export const mergeWrappedCaptionText: DomTransform = () => {
  return (document) => {
    for (const figcaption of document.querySelectorAll('figcaption')) {
      const wrapper = figcaption.parentElement

      if (!wrapper || wrapper.tagName.toLowerCase() === 'figure') {
        continue
      }

      if (!figcaption.closest('figure')) {
        continue
      }

      const siblings = Array.from(wrapper.children).filter((child) => child !== figcaption)

      if (siblings.length === 0 || !siblings.every(isCaptionText)) {
        continue
      }

      const reference = figcaption.firstChild
      let isBeforeCaption = true

      for (const child of Array.from(wrapper.children)) {
        if (child === figcaption) {
          isBeforeCaption = false
          continue
        }

        if (isBeforeCaption) {
          figcaption.insertBefore(child, reference)
          continue
        }

        figcaption.appendChild(child)
      }
    }
  }
}
