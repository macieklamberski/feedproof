import type { DomTransform } from '../../types.js'

// Feeds like Medium wrap each code line in its own <pre>, which renders as
// a stack of separate boxes instead of a unified code block. This merges
// consecutive single-line <pre> siblings into one <pre> joined by newlines.
const trailingBrRegex = /<br\s*\/?>\s*$/i
const surroundingNewlinesRegex = /^\n+|\n+$/g
const classTokenSeparator = /\s+/

export const mergeConsecutiveOneLinerPres: DomTransform = ({ preservedPreClasses }) => {
  const preservedSet = new Set(preservedPreClasses)

  const isPreserved = (element: Element): boolean => {
    const classAttribute = element.getAttribute('class')

    if (!classAttribute) {
      return false
    }

    for (const token of classAttribute.split(classTokenSeparator)) {
      if (preservedSet.has(token)) {
        return true
      }
    }

    return false
  }

  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      // Skip if already merged into a previous run.
      if (!pre.parentNode) {
        continue
      }

      // Collect a run of consecutive <pre> siblings (ignoring whitespace-only text nodes).
      const run: Array<Element> = [pre]
      let sibling = pre.nextSibling

      while (sibling) {
        if (sibling.nodeType !== 1 && sibling.nodeType !== 3) {
          break
        }

        if (sibling.nodeType === 3) {
          if (sibling.textContent?.trim() !== '') {
            break
          }

          sibling = sibling.nextSibling
          continue
        }

        if ((sibling as Element).tagName.toLowerCase() !== 'pre') {
          break
        }

        run.push(sibling as Element)
        sibling = sibling.nextSibling
      }

      if (run.length < 2) {
        continue
      }

      // Skip runs that contain a <pre> marked as author-distinct content
      // (poetry stanzas, scriptural verses, leader-dotted ToCs) — those
      // are meant to render as separate blocks even when single-line.
      if (run.some(isPreserved)) {
        continue
      }

      // Only merge if every <pre> in the run is a single line.
      // Strip only surrounding newlines (not spaces) since whitespace is meaningful in <pre>.
      const isSingleLine = (element: Element) => {
        return !element.innerHTML.replace(surroundingNewlinesRegex, '').includes('\n')
      }

      if (!run.every(isSingleLine)) {
        continue
      }

      const merged = run
        .map((element) =>
          element.innerHTML.replace(surroundingNewlinesRegex, '').replace(trailingBrRegex, ''),
        )
        .join('\n')

      pre.innerHTML = merged

      for (const element of run.slice(1)) {
        element.remove()
      }
    }
  }
}
