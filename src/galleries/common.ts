import type { GalleryItem } from '../types.js'
import { hasAncestorWithTagName } from '../utils/dom.js'

// Matches hrefs that point at an image file (the lightbox / full-size link), not a post
// permalink.
const imageUrlRegex = /\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]|$)/i

const noscriptTags = new Set(['noscript'])

export const directCaption = (element: Element): string | undefined => {
  for (const child of element.children) {
    if (child.localName !== 'figcaption') {
      continue
    }

    const text = child.textContent?.trim()

    if (text) {
      return text
    }
  }
}

const findFullUrl = (image: Element): string | undefined => {
  const parent = image.parentNode as Element | null

  if (parent?.localName !== 'a') {
    return
  }

  const href = parent.getAttribute('href')

  if (href && imageUrlRegex.test(href)) {
    return href
  }
}

// Walks up to the image's enclosing item <figure> (stopping at the gallery itself) and
// returns its direct <figcaption>, the per-image caption.
const findCaption = (image: Element, gallery: Element): string | undefined => {
  let node = image.parentNode as Element | null

  while (node && node !== gallery) {
    if (node.localName === 'figure') {
      const caption = directCaption(node)

      if (caption) {
        return caption
      }
    }

    node = node.parentNode as Element | null
  }
}

export const extractGalleryItems = (
  gallery: Element,
  imageSelector: string,
): Array<GalleryItem> => {
  const items: Array<GalleryItem> = []

  for (const image of gallery.querySelectorAll(imageSelector)) {
    // Skip <noscript> fallback images (the pipeline's fixLazyImages normally removes these
    // first; this keeps the resolver correct when used standalone).
    if (hasAncestorWithTagName(image, noscriptTags, gallery)) {
      continue
    }

    const url = image.getAttribute('src')

    if (!url) {
      continue
    }

    const alt = image.getAttribute('alt')?.trim()

    items.push({
      url,
      fullUrl: findFullUrl(image),
      alt: alt ? alt : undefined,
      caption: findCaption(image, gallery),
    })
  }

  return items
}
