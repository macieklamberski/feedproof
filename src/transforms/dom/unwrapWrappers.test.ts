import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { unwrapWrappers } from './unwrapWrappers.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('unwrapWrappers', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, unwrapWrappers(context))
  }

  it('should unwrap a single bare div wrapper', async () => {
    const value = '<div><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap nested bare wrappers', async () => {
    const value = '<div><article><p>Content</p></article></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap section and main wrappers', async () => {
    const value = '<section><main><p>Content</p></main></section>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with attributes', async () => {
    const value = '<div class="content"><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with multiple attributes', async () => {
    const value = '<div class="page" id="readability-page-1"><p>Content</p></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap wrapper with attribute values containing > characters', async () => {
    // Tailwind-style arbitrary-value selectors contain `>` inside the class
    // attribute. The old regex misparsed this; the DOM version handles it
    // correctly because linkedom parses attribute values as one unit.
    const value =
      '<section class="[&amp;:has([data-x])>*]:pointer-events-auto"><p>Article</p></section>'
    const expected = '<p>Article</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve wrapper with siblings', async () => {
    const value = '<div><p>First</p></div><div><p>Second</p></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should not unwrap non-wrapper tags', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should unwrap nested wrappers with attributes', async () => {
    const value = '<div><div id="root"><p>Content</p></div></div>'
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not unwrap when wrapper has significant text sibling', async () => {
    const value = 'lead text<div><p>Content</p></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should remove empty wrapper entirely', async () => {
    const value = '<div></div>'
    const expected = ''

    expect(await transform(value)).toBe(expected)
  })

  it('should handle empty string', async () => {
    expect(await transform('')).toBe('')
  })

  it('should handle plain text without tags', async () => {
    const value = 'Just text'

    expect(await transform(value)).toBe(value)
  })

  it('should ignore HTML comments and still unwrap the wrapper', async () => {
    const value = '<!-- preserved --><div><p>Content</p></div>'
    const expected = '<!-- preserved --><p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })
})
