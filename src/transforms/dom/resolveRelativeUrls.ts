import { parseSrcset, stringifySrcset } from 'srcset'
import { absoluteUrlRegex } from '../../common.js'
import type { DomTransform } from '../../types.js'

// `, ` (comma + whitespace) only — preserves URL-internal commas (Substack
// CDN transforms etc.) which aren't followed by whitespace.
const srcsetSeparatorRegex = /,\s+/

export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

    const elements = document.querySelectorAll(
      'a[href], [src], video[poster], img[srcset], source[srcset], image',
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
          let needsResolution = false
          const candidates = srcset.split(srcsetSeparatorRegex)

          for (const candidate of candidates) {
            const trimmed = candidate.trimStart()
            if (trimmed && !absoluteUrlRegex.test(trimmed)) {
              needsResolution = true
              break
            }
          }

          if (needsResolution) {
            const resolved = parseSrcset(srcset).map((entry) => ({
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
