import { resolveUrl } from 'feedcanon'
import { parseSrcset, stringifySrcset } from 'srcset'
import type { DomTransform } from '../../types.js'

export const resolveRelativeUrls: DomTransform = ({ baseUrl }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

    const anchors = document.querySelectorAll('a[href]')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      const resolved = resolveUrl(href, baseUrl)

      if (resolved) {
        anchor.setAttribute('href', resolved)
      }
    }

    const elementsWithSrc = document.querySelectorAll('[src]')

    for (const element of elementsWithSrc) {
      const src = element.getAttribute('src')

      if (!src) {
        continue
      }

      const resolved = resolveUrl(src, baseUrl)

      if (resolved) {
        element.setAttribute('src', resolved)
      }
    }

    const videos = document.querySelectorAll('video[poster]')

    for (const video of videos) {
      const poster = video.getAttribute('poster')

      if (!poster) {
        continue
      }

      const resolved = resolveUrl(poster, baseUrl)

      if (resolved) {
        video.setAttribute('poster', resolved)
      }
    }

    // React/Next.js SSR renders camelCase srcSet instead of lowercase srcset
    // (https://github.com/facebook/react/issues/19799). Linkedom treats attributes as case-sensitive
    // (https://github.com/WebReflection/linkedom/issues/235), so querySelectorAll('[srcset]') won't
    // match. We iterate img/source and check both casings manually.
    const elements = document.querySelectorAll('img, source')

    for (const element of elements) {
      const srcset = element.getAttribute('srcset') ?? element.getAttribute('srcSet')

      if (!srcset) {
        continue
      }

      const resolved = parseSrcset(srcset).map((entry) => ({
        ...entry,
        url: resolveUrl(entry.url, baseUrl) ?? entry.url,
      }))

      // Normalize to lowercase and remove camelCase variant.
      element.removeAttribute('srcSet')
      element.setAttribute('srcset', stringifySrcset(resolved))
    }
  }
}
