import { parseSrcset, stringifySrcset } from 'srcset'
import type { DomTransform, IsSafeUrlFn, UrlRole } from '../../types.js'
import { svgHrefAttribute, walkElements } from '../../utils/dom.js'

// Inert replacements that keep the element but render nothing: a same-page no-op for
// links, the empty document for media (about:blank loads nothing and runs nothing).
const sentinels: Record<UrlRole, string> = {
  link: '#unsafe-link',
  media: 'about:blank',
}

// Browsers strip leading C0 control characters and ASCII whitespace from a URL before reading
// its scheme, so `\x01javascript:` and `java\tscript:` both resolve to `javascript:` and run.
// `\s` catches the whitespace cases but misses the other C0 controls (`\x01`-`\x08`,
// `\x0e`-`\x1f`), so strip the whole C0 range first. The floor must hold on its own: a DOM-only
// pipeline has no stripControlChars upstream, so it can't depend on `\s` alone.
//
// Built via new RegExp so the control-char escapes live in strings instead of a regex literal.
const urlIgnorableRanges = [
  '\\s', // ASCII + Unicode whitespace.
  '\\x00-\\x1F', // C0 controls (NUL etc.) that `\\s` misses.
]
const urlIgnorableCharsRegex = new RegExp(`[${urlIgnorableRanges.join('')}]+`, 'g')
// The dangerous-scheme floor: schemes that execute or render markup. Always enforced,
// regardless of isSafeUrlFn: the scheme floor, not consumer policy.
const dangerousSchemeRegex = /^(?:javascript:|vbscript:|data:text\/html)/i
// An SVG data-URL executes when navigated to, but is inert as an image source, so it is
// rejected only for the link role.
const dangerousLinkSchemeRegex = /^data:image\/svg\+xml/i

const hasDangerousScheme = (url: string, role: UrlRole): boolean => {
  const normalized = url.replace(urlIgnorableCharsRegex, '').toLowerCase()

  return (
    dangerousSchemeRegex.test(normalized) ||
    (role === 'link' && dangerousLinkSchemeRegex.test(normalized))
  )
}

const isUnsafe = (url: string, role: UrlRole, isSafeUrlFn: IsSafeUrlFn | undefined): boolean => {
  if (hasDangerousScheme(url, role)) {
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

// URL-carrying attributes checked on every element, whatever its tag. Embed and
// cite placeholders put their URLs on data-* attributes of arbitrary elements.
const genericAttributeRoles: Array<[string, UrlRole]> = [
  ['data-embed-url', 'link'],
  ['data-cite-url', 'link'],
  ['formaction', 'link'],
  ['data-embed-src', 'media'],
  ['data-embed-thumbnail', 'media'],
  ['data-embed-avatar', 'media'],
  ['data-cite-icon', 'media'],
  ['data-cite-thumbnail', 'media'],
]
// URL-carrying attributes specific to a tag.
const tagAttributeRoles: Record<string, Array<[string, UrlRole]>> = {
  img: [['src', 'media']],
  video: [
    ['src', 'media'],
    ['poster', 'media'],
  ],
  audio: [['src', 'media']],
  source: [['src', 'media']],
  track: [['src', 'media']],
  iframe: [['src', 'media']],
  embed: [['src', 'media']],
  object: [['data', 'media']],
}
const srcsetTags = new Set(['img', 'source'])
// The two tags carrying their URL on href, which is read per element below because SVG1 spells
// it xlink:href.
const hrefTagRoles: Record<string, UrlRole> = { a: 'link', image: 'media' }

// Replaces unsafe URLs with an inert, role-appropriate sentinel while keeping the element.
// Always enforces a dangerous-scheme floor (javascript:/vbscript:/data:text/html), plus the
// caller's isSafeUrlFn policy when provided. Runs after URLs are resolved and embeds/cites are
// placeholdered, and before proxyAssetUrls.
//
// One walk covers every attribute (see walkElements), instead of a querySelectorAll per
// attribute: there are around 20 of them.
export const neutralizeUnsafeUrls: DomTransform = ({ isSafeUrlFn }) => {
  return (document) => {
    walkElements(document, (element) => {
      // Skip elements with no attributes. hasAttributes is O(1) in linkedom.
      if (!element.hasAttributes()) {
        return
      }

      for (const [attribute, role] of genericAttributeRoles) {
        neutralizeAttribute(element, attribute, role, isSafeUrlFn)
      }

      const name = element.localName
      const tagAttributes = Object.hasOwn(tagAttributeRoles, name)
        ? tagAttributeRoles[name]
        : undefined

      if (tagAttributes !== undefined) {
        for (const [attribute, role] of tagAttributes) {
          neutralizeAttribute(element, attribute, role, isSafeUrlFn)
        }

        if (srcsetTags.has(name)) {
          neutralizeSrcset(element, isSafeUrlFn)
        }

        return
      }

      const hrefRole = Object.hasOwn(hrefTagRoles, name) ? hrefTagRoles[name] : undefined

      if (hrefRole !== undefined) {
        neutralizeAttribute(element, svgHrefAttribute(element), hrefRole, isSafeUrlFn)
      }
    })
  }
}
