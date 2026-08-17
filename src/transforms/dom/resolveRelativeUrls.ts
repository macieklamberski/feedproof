import { stringifySrcset } from 'srcset'
import type { DomTransform } from '../../types.js'
import { countSrcsetCandidates, parseSrcset } from '../../utils/images.js'
import { absoluteUrlRegex } from '../../utils/urls.js'

// Runs without a `baseUrl` too. A protocol-relative url needs a scheme, not a base, and
// `resolveUrlFn` supplies one, so those are absolutised for every caller. Anything genuinely
// relative resolves to nothing without a base and is left as it stands, which is what the
// `if (resolved)` guards below already express.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
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
          const hasRelative = entries.some((entry) => !absoluteUrlRegex.test(entry.url))
          // parseSrcset drops malformed descriptor-only candidates. Rewriting when it did
          // keeps them out of the attribute even when no url needed resolving.
          const droppedCandidate = entries.length < countSrcsetCandidates(srcset)

          if (hasRelative || droppedCandidate) {
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
