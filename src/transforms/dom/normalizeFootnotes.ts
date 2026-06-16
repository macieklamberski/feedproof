import { hasAncestorWithTagName } from '../../common.js'
import type { DomTransform } from '../../types.js'

const supTags = new Set(['sup'])

// Elements that can't hold an `<a>` as a child — void elements, and containers
// with a restricted content model (a `<table>`/`<ol>` def, as docutils/rST emit).
// When a footnote target is one of these, the surviving `<a name>` goes before it.
const cannotHoldAnchor = new Set([
  'br',
  'hr',
  'img',
  'input',
  'area',
  'base',
  'col',
  'embed',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'colgroup',
  'ol',
  'ul',
  'dl',
  'select',
  'optgroup',
  'menu',
])

// Footnote-shaped fragment ids emitted by the common generators: markdown/kramdown
// `fn1`/`fnref1`, GitHub-flavored-markdown / rehype `user-content-fn-1`/`-fnref-1`,
// Word/Google-Docs export `_ftn1`/`_ftnref1`, MediaWiki `cite_note-1`, LibreOffice
// `sdfootnote1`. Tight enough to skip incidental `#fn`-prefixed nav links.
const footnoteFragmentRegex =
  /^(?:fn(?:ref)?[:._-]?\d|user-content-fn|_ftn|footnote|cite[-_]?note|sdfootnote)/i
const footnoteClassRegex = /footnote|reversefootnote/i
const footnoteRoleRegex = /doc-noteref|doc-backlink/i

// An anchor is footnote-related (a reference or a definition's back-link) when its
// fragment looks like a footnote id (covers GFM's `user-content-fn*`), it sits in a
// <sup>, or it carries a footnote class or ARIA doc role.
const isFootnoteAnchor = (anchor: Element, fragment: string): boolean => {
  return (
    footnoteFragmentRegex.test(fragment) ||
    hasAncestorWithTagName(anchor, supTags) ||
    footnoteClassRegex.test(anchor.getAttribute('class') ?? '') ||
    footnoteRoleRegex.test(anchor.getAttribute('role') ?? '')
  )
}

// Gives a footnote target a surviving `<a name="fragment">`, since the reader strips
// the `id` it currently relies on. No-op when the target already exposes that name
// (a Word/Google-Docs `<a name>` target, or a prior pass) — keeping it idempotent.
const ensureNameTarget = (document: Document, target: Element, fragment: string): void => {
  if (target.getAttribute('name') === fragment) {
    return
  }

  // When the target is itself an anchor (GFM puts the back-jump id on the ref's
  // `<a>`), set `name` on it directly — nesting an `<a>` inside an `<a>` is invalid.
  if (target.localName === 'a') {
    target.setAttribute('name', fragment)
    return
  }

  // Already relocated on a prior pass — as a child, or (for restricted hosts) as
  // the preceding sibling.
  const previous = target.previousElementSibling
  if (previous?.localName === 'a' && previous.getAttribute('name') === fragment) {
    return
  }

  for (const existing of target.querySelectorAll('a[name]')) {
    if (existing.getAttribute('name') === fragment) {
      return
    }
  }

  const anchor = document.createElement('a')
  anchor.setAttribute('name', fragment)

  if (cannotHoldAnchor.has(target.localName) && target.parentNode) {
    target.parentNode.insertBefore(anchor, target)
  } else {
    target.insertBefore(anchor, target.firstChild)
  }
}

// Footnotes link a reference (`<sup><a href="#fn1">`) to a definition (`<li id="fn1">`)
// and back. The downstream reader strips `id`, killing both navigation targets. This
// relocates each linked target onto an `<a name>` (which survives), so footnotes keep
// working in-page — mirroring the heading-permalink fix. A reference whose definition
// is missing from a truncated feed body is re-pointed at the source article instead.
export const normalizeFootnotes: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    const targets = new Map<string, Element>()

    for (const element of document.querySelectorAll('[id], [name]')) {
      const id = element.getAttribute('id')
      if (id && !targets.has(id)) {
        targets.set(id, element)
      }

      const name = element.getAttribute('name')
      if (name && !targets.has(name)) {
        targets.set(name, element)
      }
    }

    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href') ?? ''

      // Footnote links are same-page fragments by the time this runs
      // (shortenSamePageLinkFragments localized them upstream).
      if (!href.startsWith('#')) {
        continue
      }

      const fragment = href.slice(1)

      if (!fragment || !isFootnoteAnchor(anchor, fragment)) {
        continue
      }

      const target = targets.get(fragment)

      if (target) {
        ensureNameTarget(document, target, fragment)
      } else if (baseUrl) {
        // Orphan: the definition was truncated out of the feed body. Point the
        // reference at the source article so it still resolves.
        const resolved = resolveUrlFn(`#${fragment}`, baseUrl)

        if (resolved) {
          anchor.setAttribute('href', resolved)
        }
      }
    }
  }
}
