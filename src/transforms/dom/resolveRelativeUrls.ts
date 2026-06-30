import { parseSrcset, stringifySrcset } from 'srcset'
import type { DomTransform } from '../../types.js'
import { absoluteUrlRegex } from '../../utils/urls.js'

export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

    const elements = document.querySelectorAll(
      'a[href], [src], video[poster], img[srcset], source[srcset], object[data], image',
    )

    for (const element of elements) {
      const localName = element.localName

      if (localName === 'a') {
        const href = element.getAttribute('href')

        // Preserve fragment-only hrefs so in-article anchors keep scrolling locally.
        if (href && !href.startsWith('#') && !absoluteUrlRegex.test(href)) {
          const resolved = resolveUrlFn(href, baseUrl)

          if (resolved) {
            element.setAttribute('href', resolved)
          }
        }
      }

      const src = element.getAttribute('src')

      if (src && !absoluteUrlRegex.test(src)) {
        const resolved = resolveUrlFn(src, baseUrl)

        if (resolved) {
          element.setAttribute('src', resolved)
        }
      }

      if (localName === 'video') {
        const poster = element.getAttribute('poster')

        if (poster && !absoluteUrlRegex.test(poster)) {
          const resolved = resolveUrlFn(poster, baseUrl)

          if (resolved) {
            element.setAttribute('poster', resolved)
          }
        }
      }

      if (localName === 'object') {
        const data = element.getAttribute('data')

        if (data && !absoluteUrlRegex.test(data)) {
          const resolved = resolveUrlFn(data, baseUrl)

          if (resolved) {
            element.setAttribute('data', resolved)
          }
        }
      }

      // SVG <image> carries its URL on href (SVG2) or xlink:href (SVG1).
      if (localName === 'image') {
        const attribute = element.hasAttribute('href') ? 'href' : 'xlink:href'
        const href = element.getAttribute(attribute)

        if (href && !absoluteUrlRegex.test(href)) {
          const resolved = resolveUrlFn(href, baseUrl)

          if (resolved) {
            element.setAttribute(attribute, resolved)
          }
        }
      }

      if (localName === 'img' || localName === 'source') {
        const srcset = element.getAttribute('srcset')

        if (srcset) {
          const entries = parseSrcset(srcset)

          if (entries.some((entry) => !absoluteUrlRegex.test(entry.url))) {
            const resolved = entries.map((entry) => ({
              ...entry,
              url: resolveUrlFn(entry.url, baseUrl) ?? entry.url,
            }))

            element.setAttribute('srcset', stringifySrcset(resolved))
          }
        }
      }
    }
  }
}
