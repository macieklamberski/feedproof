import type { DomTransform } from '../../types.js'

const javascriptSchemeRegex = /^javascript:/i

// An anchor with an empty, bare # or javascript: href looks clickable and goes nowhere.
// A javascript: href is left over from an interactive widget whose script context is gone.
export const stripDeadAnchors: DomTransform = () => {
  return (document) => {
    const anchors = document.querySelectorAll('a')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      // An anchor with no href is a named target other links scroll to.
      if (href === null) {
        continue
      }

      const trimmed = href.trim()

      const isDead = trimmed === '' || trimmed === '#' || javascriptSchemeRegex.test(trimmed)

      if (!isDead) {
        continue
      }

      // Unwrapping an anchor with an id or name breaks the #fragment and aria-* links to it.
      if (anchor.hasAttribute('id') || anchor.hasAttribute('name')) {
        continue
      }

      const parent = anchor.parentNode

      if (!parent) {
        continue
      }

      while (anchor.firstChild) {
        parent.insertBefore(anchor.firstChild, anchor)
      }

      anchor.remove()
    }
  }
}
