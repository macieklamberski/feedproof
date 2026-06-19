import { parseSrcset, stringifySrcset } from 'srcset'
import type { DomTransform, IsSafeUrlFn, UrlRole } from '../../types.js'

// Inert replacements that keep the element but render nothing: a same-page no-op for
// links, the empty document for media (about:blank loads nothing and runs nothing).
const sentinels: Record<UrlRole, string> = {
  link: '#unsafe-link',
  media: 'about:blank',
}

// Browsers strip ASCII whitespace (tab/newline/CR/space) from a URL before parsing it,
// so `java\tscript:` and a leading newline are real evasion vectors — strip them first.
const urlWhitespaceRegex = /\s+/g
// The dangerous-scheme floor: schemes that execute or render markup. Always enforced,
// regardless of isSafeUrlFn — this is "never emit XSS", not consumer policy.
const dangerousSchemeRegex = /^(?:javascript:|vbscript:|data:text\/html)/i

const hasDangerousScheme = (url: string): boolean => {
  return dangerousSchemeRegex.test(url.replace(urlWhitespaceRegex, '').toLowerCase())
}

const isUnsafe = (url: string, role: UrlRole, isSafeUrlFn: IsSafeUrlFn | undefined): boolean => {
  if (hasDangerousScheme(url)) {
    return true
  }

  return isSafeUrlFn ? !isSafeUrlFn(url, role) : false
}

const neutralizeAttribute = (
  element: Element,
  attribute: string,
  role: UrlRole,
  isSafeUrlFn: IsSafeUrlFn | undefined,
): void => {
  const value = element.getAttribute(attribute)

  if (value && isUnsafe(value, role, isSafeUrlFn)) {
    element.setAttribute(attribute, sentinels[role])
  }
}

// Drops unsafe candidates and keeps the safe ones; falls back to the media sentinel
// only when every candidate is unsafe.
const neutralizeSrcset = (element: Element, isSafeUrlFn: IsSafeUrlFn | undefined): void => {
  const srcset = element.getAttribute('srcset')

  if (!srcset) {
    return
  }

  const safe = parseSrcset(srcset).filter((entry) => !isUnsafe(entry.url, 'media', isSafeUrlFn))

  element.setAttribute('srcset', safe.length > 0 ? stringifySrcset(safe) : sentinels.media)
}

const linkAttributeSelectors: Array<[string, string]> = [
  ['a[href]', 'href'],
  ['[data-embed-url]', 'data-embed-url'],
  ['[data-bookmark-url]', 'data-bookmark-url'],
]
const mediaAttributeSelectors: Array<[string, string]> = [
  ['img[src]', 'src'],
  ['video[src]', 'src'],
  ['video[poster]', 'poster'],
  ['audio[src]', 'src'],
  ['source[src]', 'src'],
  ['track[src]', 'src'],
  ['iframe[src]', 'src'],
  ['embed[src]', 'src'],
  ['object[data]', 'data'],
  ['[data-embed-src]', 'data-embed-src'],
  ['[data-embed-thumbnail]', 'data-embed-thumbnail'],
  ['[data-embed-avatar]', 'data-embed-avatar'],
  ['[data-bookmark-icon]', 'data-bookmark-icon'],
  ['[data-bookmark-thumbnail]', 'data-bookmark-thumbnail'],
]
const srcsetSelector = 'img[srcset], source[srcset]'

// Replaces unsafe URLs with an inert, role-appropriate sentinel while keeping the
// element. Enforces a hardcoded dangerous-scheme floor (javascript:/vbscript:/data:text/html)
// always, plus the caller's isSafeUrlFn policy when provided. Runs after URLs are
// resolved and embeds/bookmarks are placeholdered, and before proxyAssetUrls.
export const neutralizeUnsafeUrls: DomTransform = ({ isSafeUrlFn }) => {
  return (document) => {
    for (const [selector, attribute] of linkAttributeSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        neutralizeAttribute(element, attribute, 'link', isSafeUrlFn)
      }
    }

    for (const [selector, attribute] of mediaAttributeSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        neutralizeAttribute(element, attribute, 'media', isSafeUrlFn)
      }
    }

    for (const element of document.querySelectorAll(srcsetSelector)) {
      neutralizeSrcset(element, isSafeUrlFn)
    }

    // SVG <image> carries its URL on href (SVG2) or xlink:href (SVG1); proxyAssetUrls
    // rewrites it, so it must be neutralized here too. The colon in xlink:href can't go
    // in a CSS attribute selector, so match the tag and pick the attribute in JS.
    for (const element of document.querySelectorAll('image')) {
      const attribute = element.hasAttribute('href') ? 'href' : 'xlink:href'
      neutralizeAttribute(element, attribute, 'media', isSafeUrlFn)
    }
  }
}
