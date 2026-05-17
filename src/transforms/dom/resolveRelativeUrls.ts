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

      // Preserve fragment-only hrefs so in-article anchors (e.g. ToC entries
      // pointing at headings in the same article) keep scrolling locally
      // instead of navigating to the origin page.
      if (href.startsWith('#')) {
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

    const elements = document.querySelectorAll('img[srcset], source[srcset]')

    for (const element of elements) {
      const srcset = element.getAttribute('srcset')

      if (!srcset) {
        continue
      }

      const resolved = parseSrcset(srcset).map((entry) => ({
        ...entry,
        url: resolveUrl(entry.url, baseUrl) ?? entry.url,
      }))

      element.setAttribute('srcset', stringifySrcset(resolved))
    }
  }
}
