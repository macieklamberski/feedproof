import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

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

      if (value && isUrlShaped(value)) {
        audio.setAttribute('src', value)
        break
      }
    }
  }
}
