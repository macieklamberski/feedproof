import type { DomTransform } from '../../types.js'

// Strips elements that have no place in a static rendering of feed content —
// dead JS placeholders, control wrappers detached from their runtime, and
// platform-injected chrome (subscribe forms, share buttons, related-posts
// widgets, author bios, ad slots, email preheaders) that reads as noise.
export const stripNonContentElements: DomTransform = ({ nonContentSelectors }) => {
  const selector = nonContentSelectors.join(',')

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
