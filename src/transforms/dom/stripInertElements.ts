import type { DomTransform } from '../../types.js'

// Strips elements that render as nothing and do nothing once the surrounding
// runtime is gone — platform leftovers like lazy-render markers and dead
// control wrappers, where the JS that would have populated or handled them
// isn't present in a feed-reader context.
export const stripInertElements: DomTransform = ({ inertSelectors }) => {
  const selector = inertSelectors.join(',')

  return (document) => {
    if (!selector) {
      return
    }

    const elements = document.querySelectorAll(selector)

    for (const element of elements) {
      element.remove()
    }
  }
}
