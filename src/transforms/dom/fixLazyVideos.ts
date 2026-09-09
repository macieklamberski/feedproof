import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// A <video> whose clip and poster urls sit in lazy data-* attributes, so nothing shows without JS.
export const fixLazyVideos: DomTransform = (context) => (document) => {
  for (const video of document.querySelectorAll('video')) {
    if (!isUsableSrc(video.getAttribute('poster'))) {
      const poster = video.getAttribute('data-poster')

      if (poster && isUrlShaped(poster)) {
        video.setAttribute('poster', poster)
      }
    }

    // Promote a lazy src only when the element itself has nothing to play from: a
    // usable src or a <source> child means the clip already resolves.
    if (isUsableSrc(video.getAttribute('src')) || video.querySelector('source')) {
      continue
    }

    for (const attribute of context.lazySrcAttributes) {
      const value = video.getAttribute(attribute)

      if (value && isUrlShaped(value)) {
        video.setAttribute('src', value)
        break
      }
    }
  }
}
