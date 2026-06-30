import type { DomTransform } from '../../types.js'
import { isComment, isElement, isText, isWhitespaceText } from '../../utils/dom.js'

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

          if (isComment(between)) {
            between.parentNode?.removeChild(between)
          } else if (isText(between)) {
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
    if (isElement(sibling)) {
      return sibling.localName === localName ? sibling : undefined
    }

    if (isText(sibling)) {
      if (!isWhitespaceText(sibling)) {
        return
      }
      sibling = sibling.nextSibling
      continue
    }

    if (isComment(sibling)) {
      sibling = sibling.nextSibling
      continue
    }

    return
  }
}

const hasOnlyListItemChildren = (list: Element): boolean => {
  for (let child = list.firstChild; child; child = child.nextSibling) {
    if (isElement(child)) {
      if (child.localName !== 'li') {
        return false
      }
      continue
    }

    if (isText(child)) {
      if (!isWhitespaceText(child)) {
        return false
      }
      continue
    }

    if (!isComment(child)) {
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
