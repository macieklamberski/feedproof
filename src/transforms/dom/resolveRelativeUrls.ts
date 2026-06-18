import { resolveUrl } from 'feedcanon'
import { parseSrcset, stringifySrcset } from 'srcset'
import { absoluteOrOpaqueUrlRegex } from '../../common.js'
import type { DomTransform } from '../../types.js'

// `, ` (comma + whitespace) only — preserves URL-internal commas (Substack
// CDN transforms etc.) which aren't followed by whitespace.
const srcsetSeparatorRegex = /,\s+/

export const resolveRelativeUrls: DomTransform = ({ baseUrl }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

    const elements = document.querySelectorAll(
      'a[href], [src], video[poster], img[srcset], source[srcset]',
    )

    for (const element of elements) {
      const localName = element.localName

      if (localName === 'a') {
        const href = element.getAttribute('href')

        // Preserve fragment-only hrefs so in-article anchors keep scrolling locally.
        if (href && !href.startsWith('#') && !absoluteOrOpaqueUrlRegex.test(href)) {
          const resolved = resolveUrl(href, baseUrl)

          if (resolved) {
            element.setAttribute('href', resolved)
          }
        }
      }

      const src = element.getAttribute('src')

      if (src && !absoluteOrOpaqueUrlRegex.test(src)) {
        const resolved = resolveUrl(src, baseUrl)

        if (resolved) {
          element.setAttribute('src', resolved)
        }
      }

      if (localName === 'video') {
        const poster = element.getAttribute('poster')

        if (poster && !absoluteOrOpaqueUrlRegex.test(poster)) {
          const resolved = resolveUrl(poster, baseUrl)

          if (resolved) {
            element.setAttribute('poster', resolved)
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
            if (trimmed && !absoluteOrOpaqueUrlRegex.test(trimmed)) {
              needsResolution = true
              break
            }
          }

          if (needsResolution) {
            const resolved = parseSrcset(srcset).map((entry) => ({
              ...entry,
              url: resolveUrl(entry.url, baseUrl) ?? entry.url,
            }))

            element.setAttribute('srcset', stringifySrcset(resolved))
          }
        }
      }
    }
  }
}
