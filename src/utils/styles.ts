import type { Nullish } from 'trousse'

// The explicit `undefined` stands in for noUncheckedIndexedAccess, which the project does not run.
export type Declarations = Record<string, string | undefined>

// Nothing is matched ahead of the `!`: an open `\s*` there is quadratic on a long declaration.
const importantRegex = /!\s*important\s*$/i
// An unterminated comment runs to the end of the attribute, the way a browser closes it.
const commentRegex = /\/\*.*?(?:\*\/|$)/gs

// A shorthand sets every longhand it covers, so `background-image:url(a);background:red` paints
// no image at all. Reading both names without this would answer with the url the shorthand threw
// away. Only the longhands this package reads are listed, since nothing else is asked for.
const resetByShorthand = new Map([
  ['background', ['background-image']],
  ['margin', ['margin-left', 'margin-right']],
  ['padding', ['padding-top', 'padding-bottom']],
])

// Neither linkedom nor jsdom answers `element.style` for a property name written in uppercase.
// A browser honours `MAX-WIDTH:800px` all the same, checked 2026-08-20.
const parseStyles = (style: string): Declarations => {
  const styles: Declarations = Object.create(null)
  let declarationStart = 0
  let colonIndex = -1
  let parenDepth = 0
  let quote = ''
  let hasComment = false

  // Cleaning every declaration would eat a `/*` a quoted value states as its own content.
  const clean = (text: string) => {
    return hasComment ? text.replace(commentRegex, ' ') : text
  }

  const addDeclaration = (declarationEnd: number) => {
    if (colonIndex === -1) {
      return
    }

    const property = clean(style.slice(declarationStart, colonIndex)).trim()
    const statedValue = clean(style.slice(colonIndex + 1, declarationEnd))
    const value = statedValue.replace(importantRegex, '').trim()

    if (!property || !value) {
      return
    }

    // A custom property keeps its case, the one place CSS is case-sensitive.
    const name = property.startsWith('--') ? property : property.toLowerCase()

    for (const longhand of resetByShorthand.get(name) ?? []) {
      delete styles[longhand]
    }

    // A repeated property takes its last value, the way a browser resolves it.
    styles[name] = value
  }

  // A `;` inside `url(data:…;base64,…)` or a quote ends nothing, so a split on `;` will not do.
  for (let index = 0; index < style.length; index++) {
    const character = style[index]

    if (quote) {
      if (character === '\\') {
        index++
        continue
      }

      if (character === quote) {
        quote = ''
      }

      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '(') {
      parenDepth++
      continue
    }

    if (character === ')' && parenDepth > 0) {
      parenDepth--
      continue
    }

    if (parenDepth > 0) {
      continue
    }

    // A comment is whitespace to a browser, so a `;` or `:` inside one starts nothing.
    if (character === '/' && style[index + 1] === '*') {
      const commentEnd = style.indexOf('*/', index + 2)

      hasComment = true
      index = commentEnd === -1 ? style.length : commentEnd + 1
      continue
    }

    if (character === ':' && colonIndex === -1) {
      colonIndex = index
      continue
    }

    if (character === ';') {
      addDeclaration(index)
      declarationStart = index + 1
      colonIndex = -1
      hasComment = false
    }
  }

  addDeclaration(style.length)

  return styles
}

// Keyed on the attribute text as well, so a style rewritten after it was read parses again.
const parsedStyles = new WeakMap<Element, { style: string; styles: Declarations }>()
const noStyles: Declarations = Object.freeze(Object.create(null))

export const declarations = (element: Nullish<Element>): Declarations => {
  if (!element) {
    return noStyles
  }

  const style = element.getAttribute('style')

  if (!style) {
    return noStyles
  }

  const parsed = parsedStyles.get(element)

  if (parsed?.style === style) {
    return parsed.styles
  }

  const styles = parseStyles(style)

  parsedStyles.set(element, { style, styles })

  return styles
}

// A keyword is case-insensitive in CSS, `DISPLAY: NONE` being `display: none`, while a url path,
// a `content` string and a custom property keep their case.
export const keyword = (element: Nullish<Element>, property: string): string | undefined => {
  return declarations(element)[property]?.toLowerCase()
}

// CSS allows a leading `+` on a length. `50%` and `calc(100% - 2px)` state no pixel length.
// The number group is `[0-9]+(?:\.[0-9]+)?|\.[0-9]+`, not `[0-9]*\.?[0-9]+`, which is quadratic.
const pixelsRegex = /^\+?([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?$/i

export const pixels = (element: Nullish<Element>, property: string): string | undefined => {
  return declarations(element)[property]?.match(pixelsRegex)?.[1]
}

// parseFloat alone answers 0 to `0x0`, which would read as a fully transparent element.
const numberRegex = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i

// Opacity takes `50%` as 0.5.
export const number = (element: Nullish<Element>, property: string): number | undefined => {
  const value = declarations(element)[property]

  if (!value || !numberRegex.test(value)) {
    return
  }

  const parsed = Number.parseFloat(value)

  return value.endsWith('%') ? parsed / 100 : parsed
}

const bgImageUrlRegex = /url\(['"]?([^'")]+)/

// Some cards paint their thumbnail as an inline `background-image` or in the `background`
// shorthand, with no `<img>`.
export const bgImage = (element: Nullish<Element>): string | undefined => {
  const styles = declarations(element)
  const background = styles['background-image'] ?? styles.background

  return background?.match(bgImageUrlRegex)?.[1]
}
