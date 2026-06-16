import { hasAncestorWithTagName } from '../../common.js'
import type { DomTransform } from '../../types.js'

const supTags = new Set(['sup'])

// Footnote-shaped fragment ids from the common generators: markdown/kramdown
// `fn1`/`fnref1`, GitHub-flavored-markdown / rehype `user-content-fn-1`, Word/GDocs
// `_ftn1`, MediaWiki `cite_note-1`, LibreOffice `sdfootnote1`.
const footnoteFragmentRegex =
  /^(?:fn(?:ref)?[:._-]?\d|user-content-fn|_ftn|footnote|cite[-_]?note|sdfootnote)/i
const footnoteClassRegex = /footnote|reversefootnote/i
const footnoteRoleRegex = /doc-noteref|doc-backlink/i

const isFootnoteRef = (anchor: Element, fragment: string): boolean => {
  return (
    footnoteFragmentRegex.test(fragment) ||
    hasAncestorWithTagName(anchor, supTags) ||
    footnoteClassRegex.test(anchor.getAttribute('class') ?? '') ||
    footnoteRoleRegex.test(anchor.getAttribute('role') ?? '')
  )
}

// Excerpt feeds often include a footnote reference up in the text but cut the
// definition list at the bottom — leaving the ref pointing at a `#fragment` that
// doesn't exist in the body (a dead in-page link). This re-points such orphans at
// the source article (`baseUrl#fragment`) so the footnote still resolves; a
// reference whose definition IS present is left as a local fragment.
export const linkOrphanFootnotes: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  return (document) => {
    if (!baseUrl) {
      return
    }

    const targets = new Set<string>()

    for (const element of document.querySelectorAll('[id], [name]')) {
      const id = element.getAttribute('id')
      if (id) {
        targets.add(id)
      }

      const name = element.getAttribute('name')
      if (name) {
        targets.add(name)
      }
    }

    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href') ?? ''

      // Same-page fragments only (shortenSamePageLinkFragments localized them upstream).
      if (!href.startsWith('#')) {
        continue
      }

      const fragment = href.slice(1)

      if (!fragment || targets.has(fragment) || !isFootnoteRef(anchor, fragment)) {
        continue
      }

      const resolved = resolveUrlFn(`#${fragment}`, baseUrl)

      if (resolved) {
        anchor.setAttribute('href', resolved)
      }
    }
  }
}
