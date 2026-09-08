import { stringifySrcset } from 'srcset'
import type { DomTransform, ResolveUrlFn } from '../../types.js'
import { countSrcsetCandidates, parseSrcset } from '../../utils/images.js'
import { absoluteUrlRegex } from '../../utils/urls.js'

// `src` is matched on any element, not a list of tags: widget resolvers claim `script[src*="…"]`
// carriers, and a protocol-relative one has to gain a scheme here before it can be parsed.
const resolvableSelector =
  'a[href], [src], video[poster], img[srcset], source[srcset], object[data], image, blockquote[cite], q[cite], ins[cite], del[cite]'

const citeElements = new Set(['blockquote', 'q', 'ins', 'del'])

// An absolute value is left byte-identical, and a relative one with no `baseUrl` resolves to
// nothing and stays as written.
const resolveAttribute = (
  element: Element,
  attribute: string,
  baseUrl: string | undefined,
  resolveUrlFn: ResolveUrlFn,
): void => {
  const value = element.getAttribute(attribute)

  if (!value || absoluteUrlRegex.test(value)) {
    return
  }

  const resolved = resolveUrlFn(value, baseUrl)

  if (resolved) {
    element.setAttribute(attribute, resolved)
  }
}

// Rewritten even when no url needed resolving: `parseSrcset` drops malformed descriptor-only
// candidates, and the rewrite is what keeps those out of the attribute.
const resolveSrcset = (
  element: Element,
  baseUrl: string | undefined,
  resolveUrlFn: ResolveUrlFn,
): void => {
  const srcset = element.getAttribute('srcset')

  if (!srcset) {
    return
  }

  const entries = parseSrcset(srcset)
  const hasRelative = entries.some((entry) => !absoluteUrlRegex.test(entry.url))
  const droppedCandidate = entries.length < countSrcsetCandidates(srcset)

  if (!hasRelative && !droppedCandidate) {
    return
  }

  const resolved = entries.map((entry) => ({
    ...entry,
    url: resolveUrlFn(entry.url, baseUrl) ?? entry.url,
  }))

  element.setAttribute('srcset', stringifySrcset(resolved))
}

// Runs without a `baseUrl` too. A protocol-relative url needs a scheme, not a base, and
// `resolveUrlFn` supplies one, so those are absolutised for every caller. Anything genuinely
// relative resolves to nothing without a base and is left as it stands, which is what the
// `if (resolved)` guard in `resolveAttribute` expresses.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    for (const element of document.querySelectorAll(resolvableSelector)) {
      const localName = element.localName

      // Preserve fragment-only hrefs so in-article anchors keep scrolling locally. A `cite` takes
      // the opposite rule: it names no target to scroll to, so a fragment-only one is resolved.
      if (localName === 'a' && !element.getAttribute('href')?.startsWith('#')) {
        resolveAttribute(element, 'href', baseUrl, resolveUrlFn)
      }

      resolveAttribute(element, 'src', baseUrl, resolveUrlFn)

      if (localName === 'video') {
        resolveAttribute(element, 'poster', baseUrl, resolveUrlFn)
      }

      if (localName === 'object') {
        resolveAttribute(element, 'data', baseUrl, resolveUrlFn)
      }

      // SVG <image> carries its url on href (SVG2) or xlink:href (SVG1).
      if (localName === 'image') {
        const attribute = element.hasAttribute('href') ? 'href' : 'xlink:href'

        resolveAttribute(element, attribute, baseUrl, resolveUrlFn)
      }

      // The url a quotation, insertion or deletion came from.
      if (citeElements.has(localName)) {
        resolveAttribute(element, 'cite', baseUrl, resolveUrlFn)
      }

      if (localName === 'img' || localName === 'source') {
        resolveSrcset(element, baseUrl, resolveUrlFn)
      }
    }
  }
}
