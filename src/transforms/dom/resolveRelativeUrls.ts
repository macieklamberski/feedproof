import { stringifySrcset } from 'srcset'
import type { DomTransform, ResolveUrlFn } from '../../types.js'
import { walkElements } from '../../utils/dom.js'
import { countSrcsetCandidates, parseSrcset } from '../../utils/images.js'
import { absoluteUrlRegex } from '../../utils/urls.js'

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

// Url-carrying attributes read on every element, whatever its tag: widget resolvers claim
// `script[src*="…"]` carriers, and a protocol-relative one has to gain a scheme here before it
// can be parsed.
const genericAttributes = ['src']
// Url-carrying attributes specific to a tag. `cite` is the url a quotation, insertion or
// deletion came from.
const tagAttributes: Record<string, Array<string>> = {
  video: ['poster'],
  object: ['data'],
  blockquote: ['cite'],
  q: ['cite'],
  ins: ['cite'],
  del: ['cite'],
}
const srcsetTags = new Set(['img', 'source'])

// Runs without a `baseUrl` too. A protocol-relative url needs a scheme, not a base, and
// `resolveUrlFn` supplies one, so those are absolutised for every caller. Anything genuinely
// relative resolves to nothing without a base and is left as it stands, which is what the
// `if (resolved)` guard in `resolveAttribute` expresses.
//
// One walk covers every attribute (see `walkElements`): a querySelectorAll per attribute measured
// 1.7x this pass's cost on linkedom, which compiles the selector on every call.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    walkElements(document, (element) => {
      // Skip elements with no attributes. hasAttributes is O(1) in linkedom.
      if (!element.hasAttributes()) {
        return
      }

      for (const attribute of genericAttributes) {
        resolveAttribute(element, attribute, baseUrl, resolveUrlFn)
      }

      const name = element.localName
      const attributes = tagAttributes[name]

      if (attributes !== undefined) {
        for (const attribute of attributes) {
          resolveAttribute(element, attribute, baseUrl, resolveUrlFn)
        }

        return
      }

      if (srcsetTags.has(name)) {
        resolveSrcset(element, baseUrl, resolveUrlFn)

        return
      }

      // Preserve fragment-only hrefs so in-article anchors keep scrolling locally. A `cite` takes
      // the opposite rule: it names no target to scroll to, so a fragment-only one is resolved.
      if (name === 'a') {
        if (!element.getAttribute('href')?.startsWith('#')) {
          resolveAttribute(element, 'href', baseUrl, resolveUrlFn)
        }

        return
      }

      // SVG <image> carries its url on href (SVG2) or xlink:href (SVG1).
      if (name === 'image') {
        const attribute = element.hasAttribute('href') ? 'href' : 'xlink:href'

        resolveAttribute(element, attribute, baseUrl, resolveUrlFn)
      }
    })
  }
}
