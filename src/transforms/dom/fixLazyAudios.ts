import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// An <audio> whose clip url sits in a lazy data-* attribute, so nothing plays without JS.
export const fixLazyAudios: DomTransform = (context) => (document) => {
  for (const audio of document.querySelectorAll('audio')) {
    // Promote a lazy src only when the element itself has nothing to play from: a
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
