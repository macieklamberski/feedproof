import type { DomTransform } from '../../types.js'

// A real, loadable value — not empty or the `about:blank` lazy placeholder.
const isUsableSrc = (src: string | null): src is string => {
  const trimmed = src?.trim()
  return !!trimmed && trimmed !== 'about:blank'
}

// Rejects flag-style values; a real URL carries a `:`, `/`, or `.`.
const urlShapeRegex = /[:/.]/

// Promote a lazy <audio> src (the real clip URL parked in a data-* attribute) into
// `src`, so a no-JS reader can play it. Mirrors fixLazyVideos for the <audio> element
// itself; lazy <source> children are already handled by fixLazyImages.
export const fixLazyAudios: DomTransform = (context) => (document) => {
  for (const audio of document.querySelectorAll('audio')) {
    // Promote a lazy src only when the element itself has nothing to play from — a
    // usable src or a <source> child means the clip already resolves.
    if (isUsableSrc(audio.getAttribute('src')) || audio.querySelector('source')) {
      continue
    }

    for (const attribute of context.lazySrcAttributes) {
      const value = audio.getAttribute(attribute)

      if (value && urlShapeRegex.test(value)) {
        audio.setAttribute('src', value)
        break
      }
    }
  }
}
