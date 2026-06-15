import { hasAncestorWithTagName } from '../../common.js'
import type { DomTransform, ResolveUrlFn } from '../../types.js'

const headingSelector = 'h1, h2, h3, h4, h5, h6'
const supTags = new Set(['sup'])

// Anchor class tokens that static-site generators attach to heading permalinks
// (Sphinx/MkDocs, markdown-it-anchor, Docusaurus, AnchorJS, Zola). Presence of
// any of these marks the anchor as a permalink on its own.
const permalinkClasses = new Set([
  'headerlink', // Sphinx / Python-Markdown / MkDocs.
  'header-anchor', // markdown-it-anchor (VuePress / VitePress / Eleventy).
  'hash-link', // Docusaurus.
  'anchorjs-link', // AnchorJS.
  'zola-anchor', // Zola.
])

// Single-glyph permalink markers: hash, pilcrow, section sign, fleuron, link
// emoji, zero-width space. An anchor whose visible content is only one of these
// (or empty) is a decorative permalink, not real link text.
const permalinkGlyphs = new Set(['#', '¶', '§', '❡', '\u{1f517}', '​'])

const footnoteClassRegex = /footnote/i
const bracketedNumberRegex = /^\[\d+\]$/
const whitespaceRegex = /\s+/

// An anchor child is a decorative permalink marker — to be dropped rather than
// kept as heading text — when its text is empty, a lone glyph, or the inline
// `#fragment` form some generators render (e.g. `<span class="anchor">#intro</span>`).
const isGlyphMarker = (text: string, fragment: string): boolean => {
  const trimmed = text.trim()

  return trimmed === '' || permalinkGlyphs.has(trimmed) || trimmed === `#${fragment}`
}

// Lowercases and collapses runs of non-alphanumerics (Unicode-aware, so CJK and
// accented letters survive) to single hyphens, matching how generators slug a
// heading into its fragment id.
const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

// A bare `#fragment` is inherently same-page. An absolute href counts only when
// it resolves to the same origin and path as the post — guarding against a
// fragment that coincidentally slug-matches a section on a different page.
const isSamePage = (
  href: string,
  baseUrl: string | undefined,
  resolveUrlFn: ResolveUrlFn,
): boolean => {
  if (href.startsWith('#')) {
    return true
  }

  if (!baseUrl) {
    return false
  }

  const resolvedHref = resolveUrlFn(href, baseUrl)
  const resolvedBase = resolveUrlFn(baseUrl, undefined)

  if (!resolvedHref || !resolvedBase) {
    return false
  }

  try {
    const target = new URL(resolvedHref)
    const base = new URL(resolvedBase)

    return target.origin === base.origin && target.pathname === base.pathname
  } catch {}

  return false
}

// Headings carry in-page permalinks ("anchors") in many shapes: the whole
// heading wrapped in a `#fragment` link, a trailing `#`/`¶` glyph, a generator's
// empty `headerlink`/`hash-link` anchor, and so on. This collapses every shape
// to one canonical markup — an empty leading `<a name="fragment">` whose href is
// left untouched — so the heading text reads as plain text and the downstream
// reader can render a single consistent permalink marker.
export const normalizeAnchoredHeadings: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    const headings = document.querySelectorAll(headingSelector)

    for (const heading of headings) {
      const headingId = heading.getAttribute('id')
      const headingSlug = slugify(heading.textContent ?? '')
      const anchors = heading.querySelectorAll('a[href]')

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href') ?? ''
        const hashIndex = href.indexOf('#')

        if (hashIndex === -1) {
          continue
        }

        const fragment = href.slice(hashIndex + 1)

        if (fragment === '') {
          continue
        }

        const visible = (anchor.textContent ?? '').trim()
        const className = anchor.getAttribute('class') ?? ''

        // Footnote references inside headings (sup-wrapped, footnote-classed, or a
        // bracketed numeral) are citations, not permalinks — leave them alone.
        const isFootnote =
          footnoteClassRegex.test(className) ||
          bracketedNumberRegex.test(visible) ||
          hasAncestorWithTagName(anchor, supTags, heading)

        if (isFootnote) {
          continue
        }

        const isSymbolOnly = isGlyphMarker(visible, fragment)
        const hasKnownClass = className
          .split(whitespaceRegex)
          .some((token) => permalinkClasses.has(token))

        // Symbol-only and generator-class anchors are self-evident permalinks. A
        // plain text link qualifies only when it points back at its own heading
        // (fragment matches the heading's id or text slug) and is same-page.
        const fragmentSlug = slugify(fragment)
        const slugMatch =
          (headingId !== null && slugify(headingId) === fragmentSlug) ||
          (headingSlug !== '' && headingSlug === fragmentSlug)
        const qualifies =
          isSymbolOnly || hasKnownClass || (slugMatch && isSamePage(href, baseUrl, resolveUrlFn))

        if (!qualifies) {
          continue
        }

        const parent = anchor.parentNode

        if (!parent) {
          continue
        }

        // Drop a decorative glyph, but keep real link text by promoting it out of
        // the anchor (the heading text becomes plain). Inline glyph markers among
        // that text (a `#fragment` span, a lone symbol) are dropped too.
        if (isSymbolOnly) {
          while (anchor.firstChild) {
            anchor.firstChild.remove()
          }
        } else {
          while (anchor.firstChild) {
            const child = anchor.firstChild

            if (isGlyphMarker(child.textContent ?? '', fragment)) {
              child.remove()
            } else {
              parent.insertBefore(child, anchor)
            }
          }
        }

        for (const attributeName of anchor.getAttributeNames()) {
          if (attributeName !== 'href') {
            anchor.removeAttribute(attributeName)
          }
        }

        // `name` carries the in-page target (verbatim from the fragment); the href
        // is preserved for a later URL-normalization pass to shorten.
        anchor.setAttribute('name', fragment)

        // Move the now-empty anchor to the heading's front so it sits at the top of
        // a wrapped heading when used as the scroll target.
        if (heading.firstChild !== anchor) {
          heading.insertBefore(anchor, heading.firstChild)
        }
      }
    }
  }
}
