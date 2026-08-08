import { describe, expect } from 'bun:test'
import { JSDOM } from 'jsdom'
import type { MaybePromise } from 'trousse'
import {
  defaultAvatarImageHosts,
  defaultCiteResolvers,
  defaultDeferredIframeSources,
  defaultEmojiImageHosts,
  defaultGalleryResolvers,
  defaultHighlightFn,
  defaultLazyIframeAttributes,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultMediaSrcAttributes,
  defaultNonContentSelectors,
  defaultPreservedPreClasses,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultWidgetResolvers,
} from './defaults.js'
import { parseHtml as parseWithLinkedom } from './parsers/linkedom.js'
import type { TransformContext } from './types.js'

// Test adapters are synchronous, unlike the public `ParseHtmlFn` which allows a
// promise — a sync return keeps `parseHtml(html).querySelector(...)` typechecking.
type ParseHtml = (html: string) => Document

export const baseContext: TransformContext = {
  widgetResolvers: defaultWidgetResolvers,
  citeResolvers: defaultCiteResolvers,
  galleryResolvers: defaultGalleryResolvers,
  mediaSrcAttributes: defaultMediaSrcAttributes,
  emojiImageHosts: defaultEmojiImageHosts,
  avatarImageHosts: defaultAvatarImageHosts,
  nonContentSelectors: defaultNonContentSelectors,
  preservedPreClasses: defaultPreservedPreClasses,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  lazyIframeAttributes: defaultLazyIframeAttributes,
  deferredIframeSources: defaultDeferredIframeSources,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,

  resolveUrlFn: defaultResolveUrlFn,
  highlightFn: defaultHighlightFn,
}

const parseWithJsdom: ParseHtml = (html) => {
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document
}

const parsers: Record<string, ParseHtml> = {
  linkedom: parseWithLinkedom,
  jsdom: parseWithJsdom,
}

// A bare `bun test` exercises every suite under all parsers; `DOM_LIBRARY` narrows
// to one for focused debugging.
export const selectParsers = (selected: string | undefined): Array<[string, ParseHtml]> => {
  if (selected !== undefined && !(selected in parsers)) {
    throw new Error(
      `Unknown DOM_LIBRARY "${selected}". Expected one of: ${Object.keys(parsers).join(', ')}.`,
    )
  }

  return Object.entries(parsers).filter(([library]) => {
    return selected === undefined || library === selected
  })
}

const activeParsers = selectParsers(process.env.DOM_LIBRARY)

export const describeForEachParser = (name: string, fn: (parseHtml: ParseHtml) => void): void => {
  for (const [library, parseHtml] of activeParsers) {
    describe(`${name} [${library}]`, () => {
      fn(parseHtml)
    })
  }
}

// Every resolver test needs the same three lines: parse the fixture, find the element the
// resolver claims, hand it over. The result type is read off the resolver's own `extract`, so
// an embed resolver yields an `EmbedResolverResult` and a cite one a `CiteResolverResult`
// without the call site naming either, and without the cast that spelling it out would need.
type AnyResolver<Result> = {
  selector: string
  extract: (element: Element) => MaybePromise<Result | undefined>
}

export const resolverExtractor = <Result>(parseHtml: ParseHtml, resolver: AnyResolver<Result>) => {
  return async (value: string): Promise<Result | undefined> => {
    const element = parseHtml(value).querySelector(resolver.selector)

    return element ? await resolver.extract(element) : undefined
  }
}

// Substack writes a component's whole payload as JSON in `data-attrs`, with the inner quotes
// entity-encoded, which is what survives a parse and serialise roundtrip. The element around it
// differs per component, so each fixture keeps its own builder and only the encoding is shared.
// A string payload is written through untouched, which is how a test states malformed JSON.
export const substackAttrs = (attrs: Record<string, unknown> | string): string => {
  const raw = typeof attrs === 'string' ? attrs : JSON.stringify(attrs)

  return raw.replace(/"/g, '&quot;')
}

// Looks up an element that the fixture guarantees to exist, failing loudly instead of returning
// null (which would otherwise need a cast or optional chaining in every assertion).
export const queryElement = (document: Document, selector: string): Element => {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`No element matches selector "${selector}".`)
  }

  return element
}

// Lets long HTML fixtures be written multi-line and indented while producing the exact compact
// string. Each line is trimmed; lines are joined with nothing where a tag ends and the next begins
// (> meets <) or where a line starts with the closing > of a multi-attribute tag, and with a single
// space otherwise. Long tags therefore break one attribute per line with the closing > on its own
// line (a standalone /> joins with a space, matching the ` />` form). Whitespace that matters to
// the assertion must stay inside a line. Built from the cooked template strings, not String.raw:
// Bun transpiles non-ASCII source characters into \u escapes, and the raw strings would contain
// those escapes as literal text.
export const html = (strings: TemplateStringsArray, ...values: Array<unknown>): string => {
  let joined = strings[0] ?? ''

  for (const [index, value] of values.entries()) {
    joined += `${value}${strings[index + 1] ?? ''}`
  }

  const lines = joined
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  let result = ''

  for (const line of lines) {
    const isTagBoundary = result.endsWith('>') && line.startsWith('<')
    const isClosingBracket = line.startsWith('>')

    if (result === '' || isTagBoundary || isClosingBracket) {
      result += line
    } else {
      result += ` ${line}`
    }
  }

  return result
}

// Normalize serialized HTML so output can be compared across parsers: parsers
// agree on the DOM but differ in how they render it back to a string (entity
// escaping `&` vs `&amp;`, boolean attributes `controls` vs `controls=""`,
// attribute order). Parsing once and sorting attributes collapses those
// differences while leaving genuine DOM differences intact.
const normalizeHtml = (html: string): string => {
  const document = parseWithLinkedom(html)

  for (const element of document.querySelectorAll('*')) {
    const attributes = Array.from(element.attributes)
      .map((attribute) => ({ name: attribute.name, value: attribute.value }))
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const { name } of attributes) {
      element.removeAttribute(name)
    }

    for (const { name, value } of attributes) {
      element.setAttribute(name, value)
    }
  }

  return document.body.innerHTML
}

const toEqualHtml = (received: unknown, expected: string) => {
  const normalizedReceived = normalizeHtml(received as string)
  const normalizedExpected = normalizeHtml(expected)
  const pass = normalizedReceived === normalizedExpected

  return {
    pass,
    message: () =>
      pass
        ? `expected HTML not to equal\n  received: ${normalizedReceived}\n  expected: ${normalizedExpected}`
        : `expected HTML to equal\n  received: ${normalizedReceived}\n  expected: ${normalizedExpected}`,
  }
}

// Substring assertions written in linkedom's serialization (literal `&`) match
// any parser's output once the received HTML is normalized.
const toContainHtml = (received: unknown, substring: string) => {
  const normalizedReceived = normalizeHtml(received as string)
  const pass = normalizedReceived.includes(substring)

  return {
    pass,
    message: () =>
      pass
        ? `expected HTML not to contain substring\n  received: ${normalizedReceived}\n  substring: ${substring}`
        : `expected HTML to contain substring\n  received: ${normalizedReceived}\n  substring: ${substring}`,
  }
}

expect.extend({ toEqualHtml, toContainHtml })

declare module 'bun:test' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Declaration merging into the Matchers type requires an interface.
  interface Matchers<T> {
    toEqualHtml: (expected: string) => T
    toContainHtml: (substring: string) => T
  }
}
