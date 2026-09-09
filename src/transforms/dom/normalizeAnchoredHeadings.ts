import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName } from '../../utils/dom.js'
import { isSamePage } from '../../utils/urls.js'

const headingSelector = 'h1, h2, h3, h4, h5, h6'
const supTags = new Set(['sup'])

// Anchor class tokens that static-site generators attach to heading permalinks
// (Sphinx/MkDocs, markdown-it-anchor, Docusaurus, AnchorJS, Zola). Presence of
// any of these marks the anchor as a permalink on its own.
const permalinkClasses = new Set([
  'headerlink', // Sphinx / Python-Markdown / MkDocs
  'header-anchor', // markdown-it-anchor (VuePress / VitePress / Eleventy)
  'heading-anchor', // Various themes
  'heading-link', // Various themes
  'heading-mark', // Hexo and similar Markdown themes
  'hash-link', // Docusaurus
  'anchorjs-link', // AnchorJS
  'zola-anchor', // Zola
  'o-heading-link', // Eleventy themes
  'wiki-anchor', // Redmine
  'permalink', // Generic permalink markup
])

// Hash, pilcrow, section sign, fleuron, link emoji or zero-width space.
const permalinkLabelRegex = /^[#¶§❡\u{1f517}​]+$/u
const footnoteClassRegex = /footnote/i
const bracketedNumberRegex = /^\[\d+\]$/
const whitespaceRegex = /\s+/

// Accordion, collapse and tab controls (WPBakery, jQuery UI, Bootstrap) wrap the heading in an
// <a href="#panel"> whose fragment is the slugified title, so it slug-matches a permalink.
const interactiveClassRegex = /accordion|collaps|toggl|panel-title|panel-heading|tta-panel/i
const interactiveAttrRegex = /toggle|accordion|collapse/i

// An anchor child is a decorative permalink marker, to be dropped and never kept as heading
// text, when its text is empty, a lone glyph, or the inline `#fragment` form some generators
// render (e.g. `<span class="anchor">#intro</span>`).
const isGlyphMarker = (text: string, fragment: string): boolean => {
  const trimmed = text.trim()

  return trimmed === '' || permalinkLabelRegex.test(trimmed) || trimmed === `#${fragment}`
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

// A heading permalink shipped as a wrapping #fragment link, a stray glyph or a bare <a name>.
export const normalizeAnchoredHeadings: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    const headings = document.querySelectorAll(headingSelector)

    for (const heading of headings) {
      const headingId = heading.getAttribute('id')
      const headingSlug = slugify(heading.textContent ?? '')
      const anchors = heading.querySelectorAll('a')
      let permalinkFragment: string | null = null

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href')
        const hashIndex = href?.indexOf('#') ?? -1
        const visible = (anchor.textContent ?? '').trim()

        // An anchor contributes a permalink in two shapes: a `#fragment` link, or a bare
        // in-page target (`<a name>` / empty `<a id>` with no href). The bare target is
        // taken only when empty, so a named anchor wrapping real heading text is untouched.
        const isBareTarget =
          href === null &&
          visible === '' &&
          (anchor.hasAttribute('name') || anchor.hasAttribute('id'))

        let fragment: string

        if (hashIndex !== -1) {
          fragment = (href as string).slice(hashIndex + 1)
        } else if (isBareTarget) {
          fragment = anchor.getAttribute('name') ?? anchor.getAttribute('id') ?? ''
        } else {
          continue
        }

        if (fragment === '') {
          continue
        }

        const className = anchor.getAttribute('class') ?? ''

        // Footnote references inside headings (sup-wrapped, footnote-classed, or a
        // bracketed numeral) are citations, not permalinks: leave them alone.
        const isFootnote =
          footnoteClassRegex.test(className) ||
          bracketedNumberRegex.test(visible) ||
          hasAncestorWithTagName(anchor, supTags, heading)

        if (isFootnote) {
          continue
        }

        const isInteractive =
          interactiveClassRegex.test(className) ||
          interactiveClassRegex.test(heading.getAttribute('class') ?? '') ||
          anchor.getAttribute('role') === 'button' ||
          anchor.hasAttribute('aria-expanded') ||
          anchor.hasAttribute('aria-controls') ||
          anchor.getAttributeNames().some((name) => interactiveAttrRegex.test(name))

        if (isInteractive) {
          continue
        }

        const isSymbolOnly = isGlyphMarker(visible, fragment)
        const hasKnownClass = className
          .split(whitespaceRegex)
          .some((token) => permalinkClasses.has(token.toLowerCase()))

        // Symbol-only and generator-class anchors are self-evident permalinks. A
        // plain text link qualifies only when it points back at its own heading
        // (fragment matches the heading's id or text slug) and is same-page.
        const fragmentSlug = slugify(fragment)
        const slugMatch =
          (headingId !== null && slugify(headingId) === fragmentSlug) ||
          (headingSlug !== '' && headingSlug === fragmentSlug)
        const qualifies =
          isSymbolOnly ||
          hasKnownClass ||
          (slugMatch && isSamePage(href ?? '', baseUrl, resolveUrlFn))

        if (!qualifies) {
          continue
        }

        const parent = anchor.parentNode

        if (!parent) {
          continue
        }

        const wrapsHeading = (heading.textContent ?? '').trim() === visible

        if (!isSymbolOnly && wrapsHeading) {
          while (anchor.firstChild) {
            const child = anchor.firstChild

            if (isGlyphMarker(child.textContent ?? '', fragment)) {
              child.remove()
            } else {
              parent.insertBefore(child, anchor)
            }
          }
        }

        anchor.remove()

        // Target the heading's own id when a generator set one, else the anchor's
        // fragment. A bare target keeps its own name/id: that is what existing links
        // already point at. The single canonical permalink is inserted after the loop.
        if (permalinkFragment === null) {
          permalinkFragment = isBareTarget ? fragment : (headingId ?? fragment)
        }
      }

      // No anchor contributed a permalink, but a bare `id` sitting directly on the
      // heading is itself a scroll target: promote it to the same canonical anchor so
      // every heading id renders one consistent affordance.
      if (permalinkFragment === null) {
        if (!headingId) {
          continue
        }

        permalinkFragment = headingId
      }

      // The id is what keeps the empty anchor from being stripped later as empty, and left on
      // the heading too it would be a duplicate target.
      if (heading.getAttribute('id') === permalinkFragment) {
        heading.removeAttribute('id')
      }

      const permalink = document.createElement('a')
      permalink.setAttribute('id', permalinkFragment)
      permalink.setAttribute('href', `#${permalinkFragment}`)
      heading.insertBefore(permalink, heading.firstChild)
    }
  }
}
