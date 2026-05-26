import { describe, expect } from 'bun:test'
import { JSDOM } from 'jsdom'
import {
  defaultBookmarkResolvers,
  defaultEmbedResolvers,
  defaultEmojiImageHosts,
  defaultInertSelectors,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultPreservedPreClasses,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from './defaults.js'
import { parseHtml as parseWithLinkedom } from './parsers/linkedom.js'
import type { TransformContext } from './types.js'

// Test adapters are synchronous, unlike the public `ParseHtmlFn` which allows a
// promise — a sync return keeps `parseHtml(html).querySelector(...)` typechecking.
type ParseHtml = (html: string) => Document

export const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  bookmarkResolvers: defaultBookmarkResolvers,
  emojiImageHosts: defaultEmojiImageHosts,
  inertSelectors: defaultInertSelectors,
  preservedPreClasses: defaultPreservedPreClasses,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
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
const selectedLibrary = process.env.DOM_LIBRARY

if (selectedLibrary !== undefined && !(selectedLibrary in parsers)) {
  throw new Error(
    `Unknown DOM_LIBRARY "${selectedLibrary}". Expected one of: ${Object.keys(parsers).join(', ')}.`,
  )
}

const activeParsers = Object.entries(parsers).filter(([library]) => {
  return selectedLibrary === undefined || library === selectedLibrary
})

export const describeForEachParser = (name: string, fn: (parseHtml: ParseHtml) => void): void => {
  for (const [library, parseHtml] of activeParsers) {
    describe(`${name} [${library}]`, () => {
      fn(parseHtml)
    })
  }
}

// Normalize serialized HTML to a canonical form so output can be compared across
// parsers: parsers agree on the DOM but differ in how they render it back to a
// string (entity escaping `&` vs `&amp;`, boolean attributes `controls` vs
// `controls=""`, attribute order). Parsing once and sorting attributes collapses
// those differences while leaving genuine DOM differences intact.
const canonicalizeHtml = (html: string): string => {
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
  const canonicalReceived = canonicalizeHtml(received as string)
  const canonicalExpected = canonicalizeHtml(expected)
  const pass = canonicalReceived === canonicalExpected

  return {
    pass,
    message: () =>
      `expected HTML to ${pass ? 'not ' : ''}equal after canonicalization\n  received: ${canonicalReceived}\n  expected: ${canonicalExpected}`,
  }
}

// Substring assertions written in linkedom's serialization (literal `&`) match
// any parser's output once the received HTML is canonicalized.
const toContainHtml = (received: unknown, substring: string) => {
  const canonicalReceived = canonicalizeHtml(received as string)
  const pass = canonicalReceived.includes(substring)

  return {
    pass,
    message: () =>
      `expected canonicalized HTML to ${pass ? 'not ' : ''}contain substring\n  received: ${canonicalReceived}\n  substring: ${substring}`,
  }
}

expect.extend({ toEqualHtml, toContainHtml })

declare module 'bun:test' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Declaration merging into the Matchers type requires an interface.
  interface Matchers<T> {
    toEqualHtml(expected: string): T
    toContainHtml(substring: string): T
  }
}
