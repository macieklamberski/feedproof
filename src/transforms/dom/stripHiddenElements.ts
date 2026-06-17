import type { DomTransform } from '../../types.js'

const styleDisplayNoneRegex = /(?:^|;)\s*display\s*:\s*none/i
const styleVisibilityHiddenRegex = /(?:^|;)\s*visibility\s*:\s*hidden/i

// Removes elements hidden from view — the `hidden` attribute, inline `display:none`,
// or inline `visibility:hidden`. Runs early so later transforms carry fewer nodes and
// invisible junk (email preheaders, JS-only widgets) never reaches the output.
// `opacity:0` is deliberately left to removeTrackingPixels: on a generic element it is
// usually a fade-in, so it's only treated as hidden for tracking-pixel images.
export const stripHiddenElements: DomTransform = () => {
  return (document) => {
    for (const element of document.querySelectorAll('[hidden], [style]')) {
      if (element.hasAttribute('hidden')) {
        element.remove()
        continue
      }

      const style = element.getAttribute('style')

      if (style && (styleDisplayNoneRegex.test(style) || styleVisibilityHiddenRegex.test(style))) {
        element.remove()
      }
    }
  }
}
