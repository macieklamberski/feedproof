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
import { mergeFragmentedLists } from './mergeFragmentedLists.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('mergeFragmentedLists', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, mergeFragmentedLists(context))
  }

  it('should merge two consecutive ul siblings into one', async () => {
    const result = await transform('<ul><li>a</li></ul><ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge three consecutive ul siblings in one pass', async () => {
    const result = await transform('<ul><li>a</li></ul><ul><li>b</li></ul><ul><li>c</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
  })

  it('should merge consecutive ol siblings when no numbering attrs are set', async () => {
    const result = await transform('<ol><li>a</li></ol><ol><li>b</li></ol>')

    expect(result).toBe('<ol><li>a</li><li>b</li></ol>')
  })

  it('should ignore whitespace-only text nodes between siblings', async () => {
    const result = await transform('<ul><li>a</li></ul> \n <ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge across HTML comments and remove them', async () => {
    const result = await transform('<ul><li>a</li></ul><!-- gap --><ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge when both lists carry the same class', async () => {
    const result = await transform(
      '<ul class="bullets"><li>a</li></ul><ul class="bullets"><li>b</li></ul>',
    )

    expect(result).toBe('<ul class="bullets"><li>a</li><li>b</li></ul>')
  })

  it('should not merge ul followed by ol', async () => {
    const result = await transform('<ul><li>a</li></ul><ol><li>b</li></ol>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<ol><li>b</li></ol>')
  })

  it('should not merge when class attributes differ', async () => {
    const result = await transform('<ul class="a"><li>x</li></ul><ul class="b"><li>y</li></ul>')

    expect(result).toContain('<ul class="a"><li>x</li></ul>')
    expect(result).toContain('<ul class="b"><li>y</li></ul>')
  })

  it('should not merge ol when start attribute differs', async () => {
    const result = await transform('<ol><li>a</li></ol><ol start="3"><li>b</li></ol>')

    expect(result).toContain('<ol><li>a</li></ol>')
    expect(result).toContain('<ol start="3"><li>b</li></ol>')
  })

  it('should not merge ol when reversed attribute differs', async () => {
    const result = await transform('<ol><li>a</li></ol><ol reversed=""><li>b</li></ol>')

    expect(result).toContain('<ol><li>a</li></ol>')
    expect(result).toContain('reversed')
  })

  it('should not merge when separated by a paragraph', async () => {
    const result = await transform('<ul><li>a</li></ul><p>break</p><ul><li>b</li></ul>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<p>break</p>')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should not merge when separated by non-whitespace text', async () => {
    const result = await transform('<ul><li>a</li></ul>between<ul><li>b</li></ul>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('between')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should not merge when separated by a br', async () => {
    const result = await transform('<ul><li>a</li></ul><br><ul><li>b</li></ul>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should leave a single standalone list untouched', async () => {
    const result = await transform('<ul><li>only</li></ul>')

    expect(result).toBe('<ul><li>only</li></ul>')
  })

  it('should merge multiple independent runs in one pass', async () => {
    const result = await transform(
      '<ul><li>a</li></ul><ul><li>b</li></ul><p>gap</p><ul><li>c</li></ul><ul><li>d</li></ul>',
    )

    expect(result).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(result).toContain('<p>gap</p>')
    expect(result).toContain('<ul><li>c</li><li>d</li></ul>')
  })

  it('should preserve surrounding content', async () => {
    const result = await transform(
      '<p>before</p><ul><li>a</li></ul><ul><li>b</li></ul><p>after</p>',
    )

    expect(result).toContain('<p>before</p>')
    expect(result).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(result).toContain('<p>after</p>')
  })

  it('should leave nested lists inside li untouched', async () => {
    const result = await transform(
      '<ul><li>outer<ul><li>nested</li></ul></li></ul><ul><li>sibling</li></ul>',
    )

    expect(result).toContain('<li>outer<ul><li>nested</li></ul></li>')
    expect(result).toContain('<li>sibling</li>')
  })

  it('should handle the Dwell-style three-fragment case', async () => {
    const result = await transform(
      '<div><ul><li>first item</li></ul><ul><li>second item</li></ul><ul><li>third item</li></ul></div>',
    )

    expect(result).toBe(
      '<div><ul><li>first item</li><li>second item</li><li>third item</li></ul></div>',
    )
  })
})
