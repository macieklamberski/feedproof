import type { DomTransform } from '../../types.js'

const javascriptSchemeRegex = /^javascript:/i

// Some feeds carry anchors whose href has no navigation target — empty,
// fragment-only, or javascript: pseudo-protocol left over from interactive
// widgets. Once the surrounding script context is gone, the link looks
// clickable but does nothing. This unwraps those anchors so their text
// stays visible and any URLs inside become eligible for `linkifyUrls`.
export const stripDeadAnchors: DomTransform = () => {
  return (document) => {
    const anchors = document.querySelectorAll('a')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      // Anchors without an href attribute are kept — they can be named-anchor
      // targets (`<a id="top">`, `<a name="top">`) used for in-page navigation.
      if (href === null) {
        continue
      }

      const trimmed = href.trim()

      const isDead = trimmed === '' || trimmed === '#' || javascriptSchemeRegex.test(trimmed)

      if (!isDead) {
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
