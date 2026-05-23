import type { DomTransform } from '../../types.js'

// Strips elements that have no place in a static rendering of feed content —
// dead JS placeholders, control wrappers detached from their runtime, and
// platform-injected widgets (subscribe forms, social CTAs) that read as noise.
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
