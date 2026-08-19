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

// Removes a leading image the body repeats right after it. WordPress feed plugins prepend
// the post's featured image to the content, and when the author already opens the post with
// that photo the reader shows it twice in a row. The shape is cross-platform (phpBB,
// EC-CUBE, Hexo, WordPress, Drupal all produce it), so the match is positional: the first
// two images in document order share a fingerprint, not a class or a generator.
//
// Only the adjacent repeat is touched. An image repeated deeper in the body can be
// deliberate (a photo shown at the top and again beside its discussion), so anything past
// the second position stays.
export const stripDuplicateLeadingImages: DomTransform = (context) => (document) => {
  // Re-query after each removal so a run of three or more identical leading images
  // collapses to one in a single pass, which also keeps the transform idempotent.
  while (true) {
    const images = document.querySelectorAll('img[src]')

    if (images.length < 2) {
      return
    }

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
