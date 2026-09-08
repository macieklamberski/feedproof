import { stringifySrcset } from 'srcset'
import type { DomTransform, ResolveUrlFn } from '../../types.js'
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

// SVG2 spells it `href`, SVG1 `xlink:href`. Read rather than selected because jsdom matches
// `image[href]` on an element carrying only `xlink:href` and linkedom does not, so `:not([href])`
// would drop the SVG1 spelling on jsdom alone. `hasAttribute` answers alike in both.
const hrefAttribute = (element: Element): string => {
  return element.hasAttribute('href') ? 'href' : 'xlink:href'
}

type UrlAttribute = {
  selector: string
  // The name to read, or how to pick it where the element decides.
  attribute: string | ((element: Element) => string)
  // `srcset` holds many urls and is rewritten even when none resolved, so it takes its own pass.
  srcset?: boolean
}

// `src` matches any element, not a list of tags: widget resolvers claim `script[src*="…"]`
// carriers. The anchor keeps fragment-only hrefs so in-article links still scroll; a `cite` names
// nothing to scroll to, so it takes no such exception.
const urlAttributes: Array<UrlAttribute> = [
  { selector: '[src]', attribute: 'src' },
  { selector: 'a[href]:not([href^="#"])', attribute: 'href' },
  { selector: 'video[poster]', attribute: 'poster' },
  { selector: 'object[data]', attribute: 'data' },
  { selector: 'blockquote[cite], q[cite], ins[cite], del[cite]', attribute: 'cite' },
  { selector: 'image', attribute: hrefAttribute },
  { selector: 'img[srcset], source[srcset]', attribute: 'srcset', srcset: true },
]

// Runs without a `baseUrl` too. A protocol-relative url needs a scheme, not a base, and
// `resolveUrlFn` supplies one, so those are absolutised for every caller. Anything genuinely
// relative resolves to nothing without a base and is left as it stands, which is what the
// `if (resolved)` guard in `resolveAttribute` expresses.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    for (const { selector, attribute, srcset } of urlAttributes) {
      for (const element of document.querySelectorAll(selector)) {
        if (srcset) {
          resolveSrcset(element, baseUrl, resolveUrlFn)

          continue
        }

        const name = typeof attribute === 'string' ? attribute : attribute(element)

        resolveAttribute(element, name, baseUrl, resolveUrlFn)
      }
    }
  }
}
