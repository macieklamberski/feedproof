import { parseSrcset } from 'srcset'
import { getDimensions } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Prefer AVIF, then WebP. Other source types are not worth promoting over the
// <img> fallback, which is already a widely-supported format.
const formatRank: Record<string, number> = {
  'image/avif': 2,
  'image/webp': 1,
}

// Highest-resolution URL in a srcset, for the plain-src fallback that renderers
// ignoring srcset will use. Returns undefined if the srcset is unparseable.
const widestUrl = (srcset: string): string | undefined => {
  const entries = parseSrcset(srcset)

  if (entries.length === 0) {
    return
  }

  const widest = entries.reduce((best, entry) => {
    return (entry.width ?? 0) > (best.width ?? 0) ? entry : best
  })

  return widest.url || undefined
}

// Best format-only <source>: has a srcset, has no media attribute (so
// art-direction crops are skipped), preferring AVIF over WebP.
const pickModernSource = (picture: Element): Element | undefined => {
  let best: Element | undefined
  let bestRank = 0

  for (const source of picture.querySelectorAll('source')) {
    const srcset = source.getAttribute('srcset')

    if (source.hasAttribute('media') || !srcset || !widestUrl(srcset)) {
      continue
    }

    const rank = formatRank[source.getAttribute('type')?.toLowerCase() ?? ''] ?? 0

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

    if (srcset && widestUrl(srcset)) {
      return source
    }
  }
}

// Carry dimensions onto the flattened <img> when it has none of its own, from the
// promoted <source> first (most specific to the rendition we keep), then the
// <picture> element — both of which feeds use to declare the image's size and
// which would otherwise be discarded on collapse. getDimensions also reads inline
// style, so style-only sizes migrate as attributes. Both must be positive.
const carryDimensions = (image: Element, source: Element | undefined, picture: Element): void => {
  if (image.hasAttribute('width') || image.hasAttribute('height')) {
    return
  }

  for (const element of [source, picture]) {
    if (!element) {
      continue
    }

    const { width, height } = getDimensions(element)

    if (width !== undefined && height !== undefined && width > 0 && height > 0) {
      image.setAttribute('width', String(Math.round(width)))
      image.setAttribute('height', String(Math.round(height)))
      return
    }
  }
}

// Collapse each <picture> to a single <img>. When a modern format-only <source>
// (AVIF/WebP, no media query) is present, its srcset is promoted onto the img so
// the lighter format survives; the publisher's WebP/AVIF is the whole point of
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
        const url = srcset ? widestUrl(srcset) : undefined

        if (srcset && url) {
          existing.setAttribute('src', url)
          existing.setAttribute('srcset', srcset)
        }

        // Give a src-less img a fallback from its own srcset, for renderers
        // that need a plain src.
        if (!existing.getAttribute('src')) {
          const ownUrl = widestUrl(existing.getAttribute('srcset') ?? '')

          if (ownUrl) {
            existing.setAttribute('src', ownUrl)
          }
        }

        // sizes="auto" collapses a lifted image to 0x0 in renderers using
        // width:auto; drop it, but keep a real sizes value intact.
        if (existing.getAttribute('sizes') === 'auto') {
          existing.removeAttribute('sizes')
        }

        carryDimensions(existing, modern, picture)
        picture.replaceWith(existing)
        continue
      }

      const source = modern ?? firstSourceWithSrcset(picture)
      const srcset = source?.getAttribute('srcset')
      const url = srcset ? widestUrl(srcset) : undefined

      // No img and no usable source: a picture that renders nothing. Drop it.
      if (!srcset || !url) {
        picture.remove()
        continue
      }

      const image = document.createElement('img')
      image.setAttribute('src', url)
      image.setAttribute('srcset', srcset)
      carryDimensions(image, source, picture)
      picture.replaceWith(image)
    }
  }
}
