import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripInterBlockBreaks } from './stripInterBlockBreaks.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripInterBlockBreaks', () => {
  const transform = (html: string) => {
    return transformHtml(html, stripInterBlockBreaks(context))
  }

  it('should remove br between two block elements', async () => {
    expect(await transform('<p>First</p><br><p>Second</p>')).toBe('<p>First</p><p>Second</p>')
  })

  it('should remove multiple consecutive br between blocks', async () => {
    expect(await transform('<p>First</p><br><br><br><p>Second</p>')).toBe(
      '<p>First</p><p>Second</p>',
    )
  })

  it('should remove br before first block element', async () => {
    expect(await transform('<br><p>Content</p>')).toBe('<p>Content</p>')
  })

  it('should remove br after last block element', async () => {
    expect(await transform('<p>Content</p><br>')).toBe('<p>Content</p>')
  })

  it('should preserve br inside inline context', async () => {
    const value = '<p>Line one<br>Line two</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve br between inline elements at top level', async () => {
    const value = '<span>One</span><br><span>Two</span>'

    expect(await transform(value)).toBe(value)
  })

  it('should remove br with whitespace text nodes between blocks', async () => {
    expect(await transform('<p>First</p>\n  <br>\n  <p>Second</p>')).toBe(
      '<p>First</p>\n  \n  <p>Second</p>',
    )
  })

  it('should remove br between different block elements', async () => {
    expect(await transform('<p>Text</p><br><blockquote>Quote</blockquote>')).toBe(
      '<p>Text</p><blockquote>Quote</blockquote>',
    )
  })

  it('should not modify content without br', async () => {
    const value = '<p>First</p><p>Second</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should remove br between blocks separated by comments', async () => {
    expect(await transform('<p>First</p><!--x--><br><!--y--><p>Second</p>')).toBe(
      '<p>First</p><!--x--><!--y--><p>Second</p>',
    )
  })

  it('should remove br before first block when preceded by a comment', async () => {
    expect(await transform('<!--x--><br><p>Content</p>')).toBe('<!--x--><p>Content</p>')
  })
})
