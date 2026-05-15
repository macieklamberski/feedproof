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

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripInterBlockBreaks', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, stripInterBlockBreaks(context))
  }

  it('should remove br between two block elements', async () => {
    const value = '<p>First</p><br><p>Second</p>'

    expect(await transform(value)).toBe('<p>First</p><p>Second</p>')
  })

  it('should remove multiple consecutive br between blocks', async () => {
    const value = '<p>First</p><br><br><br><p>Second</p>'

    expect(await transform(value)).toBe('<p>First</p><p>Second</p>')
  })

  it('should remove br before first block element', async () => {
    const value = '<br><p>Content</p>'

    expect(await transform(value)).toBe('<p>Content</p>')
  })

  it('should remove br after last block element', async () => {
    const value = '<p>Content</p><br>'

    expect(await transform(value)).toBe('<p>Content</p>')
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
    const value = '<p>First</p>\n  <br>\n  <p>Second</p>'

    expect(await transform(value)).toBe('<p>First</p>\n  \n  <p>Second</p>')
  })

  it('should remove br between different block elements', async () => {
    const value = '<p>Text</p><br><blockquote>Quote</blockquote>'

    expect(await transform(value)).toBe('<p>Text</p><blockquote>Quote</blockquote>')
  })

  it('should not modify content without br', async () => {
    const value = '<p>First</p><p>Second</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should remove br between blocks separated by comments', async () => {
    const value = '<p>First</p><!--x--><br><!--y--><p>Second</p>'

    expect(await transform(value)).toBe('<p>First</p><!--x--><!--y--><p>Second</p>')
  })

  it('should remove br before first block when preceded by a comment', async () => {
    const value = '<!--x--><br><p>Content</p>'

    expect(await transform(value)).toBe('<!--x--><p>Content</p>')
  })
})
