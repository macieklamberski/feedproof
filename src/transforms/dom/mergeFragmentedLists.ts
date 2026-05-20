import { isWhitespaceText, Node } from '../../common.js'
import type { DomTransform } from '../../types.js'

// Some feeds emit each list item as its own one-item <ul>/<ol>. Merges runs
// of consecutive sibling lists sharing tag and attribute set into the first.
export const mergeFragmentedLists: DomTransform = () => {
  return (document) => {
    const lists = document.querySelectorAll('ul, ol')

    for (const list of lists) {
      if (!list.parentNode) {
        continue
      }

      const localName = list.localName
      const firstCandidate = nextMergeableSibling(list, localName)

      if (!firstCandidate) {
        continue
      }

      if (!hasOnlyListItemChildren(list)) {
        continue
      }

      const run: Array<Element> = [list]
      let candidate: Element | undefined = firstCandidate

      while (candidate) {
        if (!attributesEqual(list, candidate)) {
          break
        }

        if (!hasOnlyListItemChildren(candidate)) {
          break
        }

        run.push(candidate)
        candidate = nextMergeableSibling(candidate, localName)
      }

      if (run.length < 2) {
        continue
      }

      // Whitespace between fragments moves INTO the target so it keeps acting
      // as a textContent boundary; without it, the last item of one fragment
      // would fuse with the first item of the next.
      const target = run[0]

      for (let index = 1; index < run.length; index++) {
        const extra = run[index]
        let between = target.nextSibling

        while (between && between !== extra) {
          const next = between.nextSibling
          const type = between.nodeType

          if (type === Node.COMMENT_NODE) {
            between.parentNode?.removeChild(between)
          } else if (type === Node.TEXT_NODE) {
            target.appendChild(between)
          }

          between = next
        }

        while (extra.firstChild) {
          target.appendChild(extra.firstChild)
        }

        extra.remove()
      }
    }
  }
}

const nextMergeableSibling = (from: Element, localName: string): Element | undefined => {
  let sibling = from.nextSibling

  while (sibling) {
    const type = sibling.nodeType

    if (type === Node.ELEMENT_NODE) {
      return (sibling as Element).localName === localName ? (sibling as Element) : undefined
    }

    if (type === Node.TEXT_NODE) {
      if (!isWhitespaceText(sibling)) {
        return
      }
      sibling = sibling.nextSibling
      continue
    }

    if (type === Node.COMMENT_NODE) {
      sibling = sibling.nextSibling
      continue
    }

    return
  }
}

const hasOnlyListItemChildren = (list: Element): boolean => {
  for (let child = list.firstChild; child; child = child.nextSibling) {
    const type = child.nodeType

    if (type === Node.ELEMENT_NODE) {
      if ((child as Element).localName !== 'li') {
        return false
      }
      continue
    }

    if (type === Node.TEXT_NODE) {
      if (!isWhitespaceText(child)) {
        return false
      }
      continue
    }

    if (type !== Node.COMMENT_NODE) {
      return false
    }
  }
  return true
}

const attributesEqual = (a: Element, b: Element): boolean => {
  const aHas = a.hasAttributes()

  if (aHas !== b.hasAttributes()) {
    return false
  }

  if (!aHas) {
    return true
  }

  const attributes = a.attributes
  const length = attributes.length

  if (length !== b.getAttributeNames().length) {
    return false
  }

  for (let index = 0; index < length; index++) {
    const attribute = attributes[index]

    if (b.getAttribute(attribute.name) !== attribute.value) {
      return false
    }
  }

  return true
}
