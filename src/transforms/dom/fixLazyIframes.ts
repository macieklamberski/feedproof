import type { DomTransform } from '../../types.js'

// A real, loadable src — not empty or the `about:blank` lazy placeholder.
const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()
  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values; a real URL carries a `:`, `/`, or `.`.
const urlShapeRegex = /[:/.]/

// Promote a lazy/consent-gated iframe src (the real embed URL parked in a data-*
// attribute) into `src` when the src itself is empty or `about:blank`, so the
// downstream embed transform sees a resolvable iframe. Mirrors fixLazyImages.
export const fixLazyIframes: DomTransform = (context) => {
  const { lazyIframeAttributes } = context

  return (document) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      if (isUsableSrc(iframe.getAttribute('src'))) {
        continue
      }

      for (const attribute of lazyIframeAttributes) {
        const value = iframe.getAttribute(attribute)

        if (value && urlShapeRegex.test(value)) {
          iframe.setAttribute('src', value)
          break
        }
      }
    }
  }
}
