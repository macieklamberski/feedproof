import { stringifySrcset } from 'srcset'
import type { DomTransform, ResolveUrlFn } from '../../types.js'
import { svgHrefAttribute } from '../../utils/dom.js'
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

type UrlAttribute = {
  selector: string
  // The name to read, or how to pick it where the element decides.
  attribute: string | ((element: Element) => string)
  // `srcset` holds many urls and is rewritten even when none resolved, so it takes its own pass.
  srcset?: boolean
}

// Narrowing [src] to a tag list leaves the script carriers widget resolvers read unresolved.
// Absolutising a fragment-only href breaks in-article scrolling: a cite names no scroll target.
const urlAttributes: Array<UrlAttribute> = [
  { selector: '[src]', attribute: 'src' },
  { selector: 'a[href]:not([href^="#"])', attribute: 'href' },
  { selector: 'video[poster]', attribute: 'poster' },
  { selector: 'object[data]', attribute: 'data' },
  { selector: 'blockquote[cite], q[cite], ins[cite], del[cite]', attribute: 'cite' },
  { selector: 'image', attribute: svgHrefAttribute },
  { selector: 'img[srcset], source[srcset]', attribute: 'srcset', srcset: true },
]

// A relative or protocol-relative url points nowhere once the content leaves its page.
export const resolveRelativeUrls: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  // Bailing out without a baseUrl leaves protocol-relative urls without a scheme.
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
