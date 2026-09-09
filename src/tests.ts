import { describe, expect } from 'bun:test'
import { JSDOM } from 'jsdom'
import { parseHTML } from 'linkedom'
import type { MaybePromise } from 'trousse'
import {
  defaultAvatarImageHosts,
  defaultDeferredIframeSources,
  defaultEmojiImageHosts,
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
// promise: a sync return keeps `parseHtml(html).querySelector(...)` typechecking.
type ParseHtml = (html: string) => Document

export const baseContext: TransformContext = {
  widgetResolvers: defaultWidgetResolvers,
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

// The parsers a run exercises: every one by default, only the one DOM_LIBRARY names when set.
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

type AnyResolver<Result> = {
  selector: string
  extract: (element: Element) => MaybePromise<Result | undefined>
}

// Runs a resolver's extract on the element its selector claims in a fixture.
export const resolverExtractor = <Result>(parseHtml: ParseHtml, resolver: AnyResolver<Result>) => {
  return async (value: string): Promise<Result | undefined> => {
    const element = parseHtml(value).querySelector(resolver.selector)

    return element ? await resolver.extract(element) : undefined
  }
}

// The value side of jsonAttr: a payload with its quotes entity-encoded, or a string as written.
// Substack ships a card this way in `data-attrs` and Embedly in `data`.
export const jsonAttrValue = (attrs: Record<string, unknown> | string): string => {
  const raw = typeof attrs === 'string' ? attrs : JSON.stringify(attrs)

  return raw.replace(/"/g, '&quot;')
}

// An element the fixture guarantees, throwing instead of returning null.
export const queryElement = (document: Document, selector: string): Element => {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`No element matches selector "${selector}".`)
  }

  return element
}

// A multi-line fixture joined into the compact string a parser serializes.
export const html = (strings: TemplateStringsArray, ...values: Array<unknown>): string => {
  // Cooked strings, not String.raw: Bun rewrites non-ASCII source into \u escapes raw would keep.
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

// The parsers agree on the DOM and differ in serializing it: `&` against `&amp;`, `controls`
// against `controls=""`, and attribute order.
const normalizeHtml = (value: string): string => {
  const document = parseWithLinkedom(value)

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
  const value = received as string

  // Not parseWithLinkedom: it lowercases attribute names and never reproduces its own output.
  const parseUntouched = (html: string) => {
    return parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`).document
  }
  // Without this a parser repairs both sides alike and malformed output passes.
  // One match is enough: the two disagree on void elements, and the string came from one of them.
  const isWellFormed = [parseUntouched, parseWithJsdom].some((parse) => {
    return parse(value).body.innerHTML === value
  })

  if (!isWellFormed) {
    return {
      pass: false,
      message: () =>
        `expected HTML a parser would not repair\n  received: ${value}\n  repaired: ${normalizeHtml(value)}`,
    }
  }

  const normalizedReceived = normalizeHtml(value)
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
  // biome-ignore lint/style/useConsistentTypeDefinitions: Declaration merging needs an interface.
  interface Matchers<T> {
    toEqualHtml: (expected: string) => T
    toContainHtml: (substring: string) => T
  }
}
