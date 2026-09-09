import type { DomTransform } from '../../types.js'

// Subscribe forms, share buttons, ad slots and dead JS placeholders: chrome, not the post.
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
