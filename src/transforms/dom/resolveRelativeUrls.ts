import { stringifySrcset } from 'srcset'
import type { DomTransform, ResolveUrlFn } from '../../types.js'
import { hrefAttribute } from '../../utils/dom.js'
import { countSrcsetCandidates, parseSrcset } from '../../utils/images.js'
import { absoluteUrlRegex } from '../../utils/urls.js'

// Not driven by the shared `urlAttributes` table. That table keys on tag plus attribute, which
// is the question the safety and proxy passes ask, while this one matches `src` on any element
// at all: several widget resolvers match a `script[src*="…"]` carrier, and a protocol-relative
// one has to gain a scheme here before it can be parsed.
const resolvableSelector =
  'a[href], [src], video[poster], img[srcset], source[srcset], object[data], image'

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
  // parseSrcset drops malformed descriptor-only candidates. Rewriting when it did keeps them
  // out of the attribute even when no url needed resolving.
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
// `if (resolved)` guards above already express.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    for (const element of document.querySelectorAll(resolvableSelector)) {
      const localName = element.localName

      // Preserve fragment-only hrefs so in-article anchors keep scrolling locally.
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
        resolveAttribute(element, hrefAttribute(element), baseUrl, resolveUrlFn)
      }

      if (localName === 'img' || localName === 'source') {
        resolveSrcset(element, baseUrl, resolveUrlFn)
      }
    }
  }
}
