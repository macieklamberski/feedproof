import type { Nullish } from 'trousse'

// The declarations of one `style` attribute, by lowercase property name. Typed with an explicit
// `undefined` because the project does not run `noUncheckedIndexedAccess`, and without it a
// missing property reads as a `string` the callers would stop guarding.
export type Declarations = Record<string, string | undefined>

// Nothing is matched ahead of the `!`, because the value comes off a feed and an unbounded
// `\s*` in front of it costs two seconds on a 120 KB declaration. The whitespace it leaves
// behind is trimmed with the rest of the value.
const importantRegex = /!\s*important\s*$/i
// An unterminated comment runs to the end of the attribute, the way a browser closes it.
const commentRegex = /\/\*.*?(?:\*\/|$)/gs

// A shorthand sets every longhand it covers, so `background-image:url(a);background:red` paints
// no image at all. Reading both names without this would answer with the url the shorthand threw
// away. Only the longhands this package reads are listed, since nothing else is asked for.
const resetByShorthand = new Map<string, Array<string>>([
  ['background', ['background-image']],
  ['margin', ['margin-left', 'margin-right']],
  ['padding', ['padding-top', 'padding-bottom']],
])

// Reads a `style` attribute into its declarations, keyed by lowercase property name. CSS property
// names are case-insensitive, so `MAX-WIDTH:800px` is a declaration a browser honours, and neither
// parser can be asked for it: linkedom stores the name as written but only ever looks up the
// lowercase form, and jsdom drops the declaration while parsing (checked 2026-08-20). Custom
// properties keep the case they were written in, the one place CSS is case-sensitive.
//
// Finding the declaration boundaries is the whole job, and why this is a scan rather than a regex
// per property. A `;` inside `url(data:image/png;base64,…)` or a quoted string does not end a
// declaration, and only a top-level `:` separates a name from its value. A repeated property takes
// its last value, the way a browser resolves it.
const parseStyles = (style: string): Declarations => {
  const styles: Declarations = Object.create(null)
  let declarationStart = 0
  let colonIndex = -1
  let parenDepth = 0
  let quote = ''
  let hasComment = false

  // The scan already stepped over the comments, so the text is cleaned only where one was seen.
  // Cleaning every declaration would eat a `/*` that a quoted value states as its own content.
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

    const name = property.startsWith('--') ? property : property.toLowerCase()

    for (const longhand of resetByShorthand.get(name) ?? []) {
      delete styles[longhand]
    }

    styles[name] = value
  }

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

    // A comment is whitespace to a browser, so the `;` and `:` inside one start nothing. Only
    // outside a quoted value and a function, where `/*` belongs to a url rather than to CSS.
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

// The attribute is part of the cache key, so an element whose style is rewritten after it was
// read parses again instead of answering from the stale declarations. Every element with no style
// shares one frozen object, which a caller cannot corrupt for the rest of them.
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

// The value of a property whose value is a keyword, lowercased. Values are stored as written,
// because a url path, a `content` string and a custom property all keep their case, so only the
// caller knows it is reading a keyword, where CSS is case-insensitive and `DISPLAY: NONE` is the
// same declaration as `display: none`.
export const keyword = (element: Nullish<Element>, property: string): string | undefined => {
  return declarations(element)[property]?.toLowerCase()
}

// Matches a whole length value, so `50%` and `calc(100% - 2px)` state no pixel length. A leading
// `+` is a sign CSS allows and the digits carry anyway; a leading `-` is not matched, because a
// negative width is not a size. The numeric group gives each digit a single parse
// (`[0-9]+(?:\.[0-9]+)?|\.[0-9]+`, not `[0-9]*\.?[0-9]+`), which the ambiguous form makes
// quadratic on a long digit run.
const pixelsRegex = /^\+?([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*(?:px)?$/i

// The pixel count an inline style states for one property, or undefined when it states none in
// pixels. The digits come back as they were written, without the unit and unparsed, because the
// callers want different bounds on the same read: a resolver taking a player's own size runs it
// through parsePixelSize, while getElementDimensions has to keep 0, 1 and 2 for
// removeTrackingPixels, which that bound would reject.
export const pixels = (element: Nullish<Element>, property: string): string | undefined => {
  return declarations(element)[property]?.match(pixelsRegex)?.[1]
}

// Matches a whole CSS number, with the exponent and the sign the grammar allows. Checking the
// shape is the point: `Number.parseFloat` alone answers 0 to spellings CSS does not have, `0x0`
// among them, which would read as a fully transparent element.
const numberRegex = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i

// The number a property states, for the ones that take a plain number rather than a length. A
// percentage comes back as the fraction it names, so `50%` reads as 0.5, which is what opacity
// means by it.
export const number = (element: Nullish<Element>, property: string): number | undefined => {
  const value = declarations(element)[property]

  if (!value || !numberRegex.test(value)) {
    return
  }

  const parsed = Number.parseFloat(value)

  return value.endsWith('%') ? parsed / 100 : parsed
}

const bgImageUrlRegex = /url\(['"]?([^'")]+)/

// The first url in an element's inline `background-image`, for cards that paint their
// thumbnail with CSS instead of an `<img>`. The shorthand states it among the colour and
// the repeat, so both properties are read and the url is picked out of the value.
export const bgImage = (element: Nullish<Element>): string | undefined => {
  const styles = declarations(element)
  const background = styles['background-image'] ?? styles.background

  return background?.match(bgImageUrlRegex)?.[1]
}
