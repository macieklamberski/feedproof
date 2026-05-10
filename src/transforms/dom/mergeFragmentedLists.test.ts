import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import type { TransformContext } from '../../types.js'
import { mergeFragmentedLists } from './mergeFragmentedLists.js'

const context: TransformContext = {}

describe('mergeFragmentedLists', () => {
  const merge = (html: string) => {
    return transformHtml(html, mergeFragmentedLists(context))
  }

  it('should merge two consecutive ul siblings into one', () => {
    const result = merge('<ul><li>a</li></ul><ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge three consecutive ul siblings in one pass', () => {
    const result = merge(
      '<ul><li>a</li></ul><ul><li>b</li></ul><ul><li>c</li></ul>',
    )

    expect(result).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
  })

  it('should merge consecutive ol siblings when no numbering attrs are set', () => {
    const result = merge('<ol><li>a</li></ol><ol><li>b</li></ol>')

    expect(result).toBe('<ol><li>a</li><li>b</li></ol>')
  })

  it('should ignore whitespace-only text nodes between siblings', () => {
    const result = merge('<ul><li>a</li></ul> \n <ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge across HTML comments and remove them', () => {
    const result = merge('<ul><li>a</li></ul><!-- gap --><ul><li>b</li></ul>')

    expect(result).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('should merge when both lists carry the same class', () => {
    const result = merge(
      '<ul class="bullets"><li>a</li></ul><ul class="bullets"><li>b</li></ul>',
    )

    expect(result).toBe('<ul class="bullets"><li>a</li><li>b</li></ul>')
  })

  it('should not merge ul followed by ol', () => {
    const result = merge('<ul><li>a</li></ul><ol><li>b</li></ol>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<ol><li>b</li></ol>')
  })

  it('should not merge when class attributes differ', () => {
    const result = merge(
      '<ul class="a"><li>x</li></ul><ul class="b"><li>y</li></ul>',
    )

    expect(result).toContain('<ul class="a"><li>x</li></ul>')
    expect(result).toContain('<ul class="b"><li>y</li></ul>')
  })

  it('should not merge ol when start attribute differs', () => {
    const result = merge('<ol><li>a</li></ol><ol start="3"><li>b</li></ol>')

    expect(result).toContain('<ol><li>a</li></ol>')
    expect(result).toContain('<ol start="3"><li>b</li></ol>')
  })

  it('should not merge ol when reversed attribute differs', () => {
    const result = merge('<ol><li>a</li></ol><ol reversed=""><li>b</li></ol>')

    expect(result).toContain('<ol><li>a</li></ol>')
    expect(result).toContain('reversed')
  })

  it('should not merge when separated by a paragraph', () => {
    const result = merge(
      '<ul><li>a</li></ul><p>break</p><ul><li>b</li></ul>',
    )

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<p>break</p>')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should not merge when separated by non-whitespace text', () => {
    const result = merge('<ul><li>a</li></ul>between<ul><li>b</li></ul>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('between')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should not merge when separated by a br', () => {
    const result = merge('<ul><li>a</li></ul><br><ul><li>b</li></ul>')

    expect(result).toContain('<ul><li>a</li></ul>')
    expect(result).toContain('<ul><li>b</li></ul>')
  })

  it('should leave a single standalone list untouched', () => {
    const result = merge('<ul><li>only</li></ul>')

    expect(result).toBe('<ul><li>only</li></ul>')
  })

  it('should merge multiple independent runs in one pass', () => {
    const result = merge(
      '<ul><li>a</li></ul><ul><li>b</li></ul><p>gap</p><ul><li>c</li></ul><ul><li>d</li></ul>',
    )

    expect(result).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(result).toContain('<p>gap</p>')
    expect(result).toContain('<ul><li>c</li><li>d</li></ul>')
  })

  it('should preserve surrounding content', () => {
    const result = merge(
      '<p>before</p><ul><li>a</li></ul><ul><li>b</li></ul><p>after</p>',
    )

    expect(result).toContain('<p>before</p>')
    expect(result).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(result).toContain('<p>after</p>')
  })

  it('should leave nested lists inside li untouched', () => {
    const result = merge(
      '<ul><li>outer<ul><li>nested</li></ul></li></ul><ul><li>sibling</li></ul>',
    )

    expect(result).toContain('<li>outer<ul><li>nested</li></ul></li>')
    expect(result).toContain('<li>sibling</li>')
  })

  it('should handle the Dwell-style three-fragment case', () => {
    const result = merge(
      '<div><ul><li>first item</li></ul><ul><li>second item</li></ul><ul><li>third item</li></ul></div>',
    )

    expect(result).toBe(
      '<div><ul><li>first item</li><li>second item</li><li>third item</li></ul></div>',
    )
  })
})
