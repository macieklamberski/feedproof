import type { DomTransform } from '../../types.js'
import { isElementHidden } from '../../utils/dom.js'

// An element hidden inline or by attribute is an email preheader or a JS-only widget's shell.
export const stripHiddenElements: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('[hidden], [style]')) {
      // Treating opacity:0 as hidden here deletes content that only fades in.
      if (isElementHidden(element)) {
        element.remove()
      }
    }
  }
}
