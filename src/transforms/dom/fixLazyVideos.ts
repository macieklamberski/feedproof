import type { DomTransform } from '../../types.js'
import { isUrlShaped, isUsableSrc } from '../../utils/urls.js'

// Promote a lazy <video> src (the real clip URL parked in a data-* attribute) into
// `src`, and a lazy `data-poster` into `poster`, so a no-JS reader shows the still
// frame and can play the clip. Only the <video> element itself is fixed here: lazy
// <source> children are already handled by fixLazyImages.
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
