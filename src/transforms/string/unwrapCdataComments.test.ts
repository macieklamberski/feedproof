import { describe, expect, it } from 'bun:test'
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
import { unwrapCdataComments } from './unwrapCdataComments.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('unwrapCdataComments', () => {
  const transform = unwrapCdataComments(context)

  it('should unwrap a basic CDATA wrapper', () => {
    expect(transform('<!--[CDATA[<p>article</p>]]-->')).toBe('<p>article</p>')
  })

  it('should unwrap with whitespace inside the wrapper', () => {
    expect(transform('<!-- [CDATA[ <p>article</p> ]] -->')).toBe(' <p>article</p> ')
  })

  it('should unwrap alongside real content', () => {
    expect(transform('<h1>title</h1><!--[CDATA[<p>body</p>]]-->')).toBe('<h1>title</h1><p>body</p>')
  })

  it('should leave regular HTML comments alone', () => {
    const value = '<p>foo</p><!-- not CDATA --><p>bar</p>'

    expect(transform(value)).toBe(value)
  })

  it('should leave conditional IE comments alone', () => {
    const value = '<!--[if IE]><p>legacy</p><![endif]-->'

    expect(transform(value)).toBe(value)
  })

  it('should unwrap split-CDATA where the article contains internal -->', () => {
    // The non-greedy regex matches up to the FIRST `]]-->` regardless of
    // intermediate `<!--…-->` sequences. At the string level there's no
    // parser to confuse with internal `-->` boundaries.
    const value = '<!--[CDATA[<p>before</p><!--StartFragment--><p>after</p>]]-->'
    const expected = '<p>before</p><!--StartFragment--><p>after</p>'

    expect(transform(value)).toBe(expected)
  })

  it('should unwrap CDATA with multiple internal --> markers', () => {
    const value = '<!--[CDATA[<p>x</p><!--A--><p>y</p><!--B--><p>z</p>]]-->'
    const expected = '<p>x</p><!--A--><p>y</p><!--B--><p>z</p>'

    expect(transform(value)).toBe(expected)
  })

  it('should unwrap multiple CDATA wrappers in one pass', () => {
    expect(transform('<!--[CDATA[A]]--><!--[CDATA[B]]-->')).toBe('AB')
  })

  it('should unwrap a CDATA wrapper inside an attribute value', () => {
    // Real-world case (Prestige Magazine in the audit corpus): an editor
    // wrote `<a href="<![CDATA[...]]>">` and the browser round-tripped it
    // into a bogus-comment shape baked into the attribute. Recovering the
    // bare URL keeps the link clickable.
    const value = '<a href="<!--[CDATA[https://example.com/post]]-->">link</a>'
    const expected = '<a href="https://example.com/post">link</a>'

    expect(transform(value)).toBe(expected)
  })

  it('should leave unterminated CDATA shape alone', () => {
    // No matching `]]-->` — leave verbatim; the HTML parser will treat it
    // as a bogus/unterminated comment.
    const value = '<!--[CDATA[unterminated'

    expect(transform(value)).toBe(value)
  })

  it('should handle empty CDATA wrapper', () => {
    expect(transform('<!--[CDATA[]]-->')).toBe('')
  })

  it('should handle empty input', () => {
    expect(transform('')).toBe('')
  })

  it('should be idempotent on already-unwrapped content', async () => {
    const value = '<p>plain content</p>'

    expect(await transform(await transform(value))).toBe(value)
  })
})
