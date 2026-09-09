import type { DomTransform } from '../../types.js'
import { removeWithEmptyWrappers } from '../../utils/dom.js'
import { getImageFingerprint, getUrlSizeHint, pickLargerImageUrl } from '../../utils/images.js'

// The copy with the smaller rendition goes. Most pairs are byte-identical and the choice
// is moot, but either side can be the scaled-down variant of the other, and dropping by
// position alone can keep a thumbnail while deleting the full image.
const pickRemovableIndex = (firstSrc: string, secondSrc: string): number => {
  const larger = pickLargerImageUrl(firstSrc, secondSrc)

  if (larger === firstSrc) {
    return 1
  }

  if (larger === secondSrc) {
    return 0
  }

  // No strict winner. A src with no encoded size is the unscaled original and outranks
  // a sized rendition. Otherwise position decides and the later copy stays.
  if (getUrlSizeHint(firstSrc) === 0 && getUrlSizeHint(secondSrc) > 0) {
    return 1
  }

  return 0
}

// A feed that prepends the featured image shows it twice when the post already opens with it.
// WordPress feed plugins prepend it, and phpBB, EC-CUBE, Hexo and Drupal produce the same pair.
export const stripDuplicateLeadingImages: DomTransform = (context) => (document) => {
  // A single query leaves two of a run of three identical leading images.
  while (true) {
    const images = document.querySelectorAll('img[src]')

    if (images.length < 2) {
      return
    }

    // Widening past the second image deletes a photo the author repeats beside its discussion.
    const firstSrc = images[0].getAttribute('src') ?? ''
    const secondSrc = images[1].getAttribute('src') ?? ''
    const firstKey = getImageFingerprint(firstSrc, context.cleanUrlFn)
    const secondKey = getImageFingerprint(secondSrc, context.cleanUrlFn)

    if (firstKey !== secondKey) {
      return
    }

    removeWithEmptyWrappers(images[pickRemovableIndex(firstSrc, secondSrc)])
  }
}
