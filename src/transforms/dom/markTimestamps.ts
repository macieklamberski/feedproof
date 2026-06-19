import { isElement, isText } from '../../common.js'
import type { DomTransform } from '../../types.js'

const timestampIgnoreTags = new Set(['a', 'pre', 'code', 'kbd', 'samp', 'var', 'script', 'style'])

// Matches a timestamp anchored to a line boundary — either starting the line
// (optionally after leading whitespace) or ending it (optionally before
// trailing whitespace): MM:SS or HH:MM:SS, with the seconds always two digits.
// Anchoring to a boundary avoids turning incidental "12:30" mentions in the
// middle of prose into markers.
const timestampToken = '(?:\\d{1,2}:)?\\d{1,2}:\\d{2}'
// The token is captured in one of two groups: at a line start (optional whitespace
// prefix consumed ahead of it) or before a line end (trailing whitespace in a zero-width
// lookahead). The prefix is consumed, not matched in a variable-length lookbehind, so a
// long whitespace run is scanned once rather than re-scanned per position.
const lineBoundaryTimestampRegex = new RegExp(
  `(?:^|\\n)[ \\t]*(${timestampToken})|(${timestampToken})(?=[ \\t]*(?:\\n|$))`,
  'g',
)

const numericPartRegex = /^\d+$/

// Parse a "MM:SS" or "HH:MM:SS" timestamp into total seconds. Returns undefined
// for anything that is not a valid timestamp: wrong number of parts, non-numeric
// parts, or seconds (and minutes in the HH:MM:SS form) outside 0-59. Minutes are
// unbounded in the MM:SS form (e.g. "90:00").
export const parseTimestampSeconds = (timestamp: string): number | undefined => {
  const parts = timestamp.split(':')

  if (!parts.every((part) => numericPartRegex.test(part))) {
    return
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number)

    if (seconds > 59) {
      return
    }

    return minutes * 60 + seconds
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number)

    if (minutes > 59 || seconds > 59) {
      return
    }

    return hours * 3600 + minutes * 60 + seconds
  }
}

const shouldSkipElement = (element: Element): boolean => {
  return (
    timestampIgnoreTags.has(element.tagName.toLowerCase()) || element.hasAttribute('data-timestamp')
  )
}

// Iterative depth-first walk (an explicit stack rather than recursion) so a deeply
// nested document can't overflow the call stack. Children are pushed in reverse so
// they pop in document order. A skippable element prunes its whole subtree.
const collectTextNodes = (root: Node): Array<Node> => {
  const result: Array<Node> = []
  const stack: Array<Node> = [root]

  while (stack.length > 0) {
    const node = stack.pop() as Node

    if (isText(node)) {
      result.push(node)
      continue
    }

    if (isElement(node) && shouldSkipElement(node)) {
      continue
    }

    const children = node.childNodes
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index])
    }
  }

  return result
}

// Wraps line-boundary YouTube-style timestamps (e.g. "01:21 - Title" or
// "Title - 01:21") in a span carrying the time in seconds, so the reader can
// later seek a player to that point. The visible text is left as-is; only the
// seconds attribute is added.
export const markTimestamps: DomTransform = () => {
  return (document) => {
    // Walk from document (not documentElement) so linkedom fragment siblings are
    // reachable. documentElement only points to the first root-level element.
    const textNodes = collectTextNodes(document) as Array<ChildNode>

    for (const node of textNodes) {
      const text = node.textContent

      // Fast pre-check: a timestamp needs at least one colon.
      if (!text?.includes(':')) {
        continue
      }

      // Split the text node into alternating text + span parts.
      // E.g. "00:00 - Intro" becomes [<span>, " - Intro"].
      const parts: Array<Node> = []
      let lastIndex = 0

      for (const match of text.matchAll(lineBoundaryTimestampRegex)) {
        const token = match[1] ?? match[2]

        if (!token) {
          continue
        }

        const seconds = parseTimestampSeconds(token)

        if (seconds === undefined) {
          continue
        }

        // The line-start branch consumes a whitespace prefix, so the token sits at
        // the end of the overall match; derive its offset from the match end.
        const tokenStart = (match.index ?? 0) + match[0].length - token.length

        if (tokenStart > lastIndex) {
          parts.push(document.createTextNode(text.slice(lastIndex, tokenStart)))
        }

        const span = document.createElement('span')
        span.setAttribute('data-timestamp', String(seconds))
        span.textContent = token
        parts.push(span)
        lastIndex = tokenStart + token.length
      }

      if (parts.length === 0) {
        continue
      }

      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)))
      }

      node.replaceWith(...parts)
    }
  }
}
