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

  it('should move inter-fragment whitespace inside the merged list as a separator', async () => {
    // Whitespace between fragments gets moved INTO the merged list between
    // absorbed items so it keeps acting as a textContent boundary — without
    // it the last `<li>` of one fragment fuses with the first `<li>` of the
    // next on textContent extraction.
    const value = '<ul><li>a</li></ul> \n <ul><li>b</li></ul>'
    const expected = '<ul><li>a</li> \n <li>b</li></ul>'

    expect(await transform(value)).toBe(expected)
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
    const value = '<ul><li>a</li></ul><ol><li>b</li></ol>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when class attributes differ', async () => {
    const value = '<ul class="a"><li>x</li></ul><ul class="b"><li>y</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge ol when start attribute differs', async () => {
    const value = '<ol><li>a</li></ol><ol start="3"><li>b</li></ol>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge ol when reversed attribute differs', async () => {
    const value = '<ol><li>a</li></ol><ol reversed=""><li>b</li></ol>'
    const expected = '<ol><li>a</li></ol><ol reversed><li>b</li></ol>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge when separated by a paragraph', async () => {
    const value = '<ul><li>a</li></ul><p>break</p><ul><li>b</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when separated by non-whitespace text', async () => {
    const value = '<ul><li>a</li></ul>between<ul><li>b</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when separated by a br', async () => {
    const value = '<ul><li>a</li></ul><br><ul><li>b</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should leave a single standalone list untouched', async () => {
    const result = await transform('<ul><li>only</li></ul>')

    expect(result).toBe('<ul><li>only</li></ul>')
  })

  it('should merge multiple independent runs in one pass', async () => {
    const value =
      '<ul><li>a</li></ul><ul><li>b</li></ul><p>gap</p><ul><li>c</li></ul><ul><li>d</li></ul>'
    const expected = '<ul><li>a</li><li>b</li></ul><p>gap</p><ul><li>c</li><li>d</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve surrounding content', async () => {
    const value = '<p>before</p><ul><li>a</li></ul><ul><li>b</li></ul><p>after</p>'
    const expected = '<p>before</p><ul><li>a</li><li>b</li></ul><p>after</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave nested lists inside li untouched', async () => {
    const value = '<ul><li>outer<ul><li>nested</li></ul></li></ul><ul><li>sibling</li></ul>'
    const expected = '<ul><li>outer<ul><li>nested</li></ul></li><li>sibling</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge lists that contain direct text instead of <li>', async () => {
    const value = '<ul>Item one</ul><ul>Item two</ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when one list contains direct text alongside valid lists', async () => {
    const value = '<ul><li>a</li></ul><ul>orphan text</ul><ul><li>c</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve text content separator between merged fragments', async () => {
    // The newline that originally separated `foo` and `bar` in textContent
    // ends up between the two `<li>`s inside the merged list, so the
    // textContent stays `foo\nbar` instead of fusing into `foobar`.
    const value = '<ul><li>foo</li></ul>\n<ul><li>bar</li></ul>'
    const expected = '<ul><li>foo</li>\n<li>bar</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge when a list contains a non-li element child', async () => {
    const value = '<ul><p>oops</p></ul><ul><li>valid</li></ul>'

    expect(await transform(value)).toBe(value)
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
