import { toMap } from 'trousse'
import type { DomTransform } from '../../types.js'
import { widestSrcsetUrl } from '../../utils/images.js'
import { createImage } from '../../utils/widgets.js'

// Prefer AVIF, then WebP. Other source types are not worth promoting over the
// <img> fallback, which is already a widely-supported format.
const formatRank: ReadonlyMap<string, number> = toMap({
  'image/avif': 2,
  'image/webp': 1,
})

// Best format-only <source>: has a srcset, has no media attribute (so
// art-direction crops are skipped), preferring AVIF over WebP.
const pickModernSource = (picture: Element): Element | undefined => {
  let best: Element | undefined
  let bestRank = 0

  for (const source of picture.querySelectorAll('source')) {
    const srcset = source.getAttribute('srcset')

    if (source.hasAttribute('media') || !srcset || !widestSrcsetUrl(srcset)) {
      continue
    }

    const type = source.getAttribute('type')?.toLowerCase() ?? ''
    const rank = formatRank.get(type) ?? 0

    if (rank > bestRank) {
      best = source
      bestRank = rank
    }
  }

  return best
}

const firstSourceWithSrcset = (picture: Element): Element | undefined => {
  for (const source of picture.querySelectorAll('source')) {
    const srcset = source.getAttribute('srcset')

    if (srcset && widestSrcsetUrl(srcset)) {
      return source
    }
  }
}

// Collapse each <picture> to a single <img>. When a modern format-only <source>
// (AVIF/WebP, no media query) is present, its srcset is promoted onto the img so
// the lighter format survives. The publisher's WebP/AVIF is the whole point of
// most feed <picture> elements. Art-direction sources (with media) are left to
// the plain <img> fallback. A <picture> missing its <img> (invalid, but seen in
// feeds) gets one synthesized from the best available source.
export const flattenPictureElements: DomTransform = () => {
  return (document) => {
    const pictures = document.querySelectorAll('picture')

    for (const picture of pictures) {
      const existing = picture.querySelector('img')
      const modern = pickModernSource(picture)

      if (existing) {
        const srcset = modern?.getAttribute('srcset')
        const url = widestSrcsetUrl(srcset)

        if (srcset && url) {
          existing.setAttribute('src', url)
          existing.setAttribute('srcset', srcset)
        }

        // Give a src-less img a fallback from its own srcset, for renderers
        // that need a plain src.
        if (!existing.getAttribute('src')) {
          const ownUrl = widestSrcsetUrl(existing.getAttribute('srcset'))

          if (ownUrl) {
            existing.setAttribute('src', ownUrl)
          }
        }

        // sizes="auto" collapses a lifted image to 0x0 in renderers using
        // width:auto. Drop it, but keep a real sizes value intact.
        if (existing.getAttribute('sizes') === 'auto') {
          existing.removeAttribute('sizes')
        }

        picture.replaceWith(existing)
        continue
      }

      const source = modern ?? firstSourceWithSrcset(picture)
      const srcset = source?.getAttribute('srcset')
      const url = widestSrcsetUrl(srcset)

      // No img and no usable source: a picture that renders nothing. Drop it.
      if (!srcset || !url) {
        picture.remove()
        continue
      }

      picture.replaceWith(createImage(document, { src: url, srcset }))
    }
  }
}
