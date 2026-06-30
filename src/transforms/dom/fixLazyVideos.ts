import type { DomTransform } from '../../types.js'

// A real, loadable value — not empty or the `about:blank` lazy placeholder.
const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()
  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values; a real URL carries a `:`, `/`, or `.`.
const urlShapeRegex = /[:/.]/

// Promote a lazy <video> src (the real clip URL parked in a data-* attribute) into
// `src`, and a lazy `data-poster` into `poster`, so a no-JS reader shows the still
// frame and can play the clip. Mirrors fixLazyIframes for the <video> element itself;
// lazy <source> children are already handled by fixLazyImages.
export const fixLazyVideos: DomTransform = (context) => {
  const { lazySrcAttributes } = context

  return (document) => {
    for (const video of document.querySelectorAll('video')) {
      if (!isUsableSrc(video.getAttribute('poster'))) {
        const poster = video.getAttribute('data-poster')

        if (poster && urlShapeRegex.test(poster)) {
          video.setAttribute('poster', poster)
        }
      }

      // Promote a lazy src only when the element itself has nothing to play from — a
      // usable src or a <source> child means the clip already resolves.
      if (isUsableSrc(video.getAttribute('src')) || video.querySelector('source')) {
        continue
      }

      for (const attribute of lazySrcAttributes) {
        const value = video.getAttribute(attribute)

        if (value && urlShapeRegex.test(value)) {
          video.setAttribute('src', value)
          break
        }
      }
    }
  }
}
