import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { mergeFragmentedLists } from './mergeFragmentedLists.js'

describeForEachParser('mergeFragmentedLists', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [mergeFragmentedLists(context)])
  }

  it('should merge two consecutive ul siblings into one', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
    `
    const expected = '<ul><li>a</li><li>b</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should merge three consecutive ul siblings in one pass', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
      <ul>
        <li>c</li>
      </ul>
    `
    const expected = '<ul><li>a</li><li>b</li><li>c</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should merge consecutive ol siblings when no numbering attrs are set', async () => {
    const value = html`
      <ol>
        <li>a</li>
      </ol>
      <ol>
        <li>b</li>
      </ol>
    `
    const expected = '<ol><li>a</li><li>b</li></ol>'

    expect(await transform(value)).toBe(expected)
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
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <!-- gap -->
      <ul>
        <li>b</li>
      </ul>
    `
    const expected = '<ul><li>a</li><li>b</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should merge despite a comment nested inside a fragment', async () => {
    const value = html`
      <ul>
        <!-- x -->
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
    `
    const expected = '<ul><!-- x --><li>a</li><li>b</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should merge when both lists carry the same class', async () => {
    const value = html`
      <ul class="bullets">
        <li>a</li>
      </ul>
      <ul class="bullets">
        <li>b</li>
      </ul>
    `
    const expected = '<ul class="bullets"><li>a</li><li>b</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge ul followed by ol', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ol>
        <li>b</li>
      </ol>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when class attributes differ', async () => {
    const value = html`
      <ul class="a">
        <li>x</li>
      </ul>
      <ul class="b">
        <li>y</li>
      </ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when attribute names differ despite equal attribute counts', async () => {
    const value = html`
      <ul class="bullets">
        <li>x</li>
      </ul>
      <ul id="bullets">
        <li>y</li>
      </ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge ol when start attribute differs', async () => {
    const value = html`
      <ol>
        <li>a</li>
      </ol>
      <ol start="3">
        <li>b</li>
      </ol>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge ol when reversed attribute differs', async () => {
    const value = html`
      <ol>
        <li>a</li>
      </ol>
      <ol reversed="">
        <li>b</li>
      </ol>
    `
    const expected = html`
      <ol>
        <li>a</li>
      </ol>
      <ol reversed>
        <li>b</li>
      </ol>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not merge when separated by a paragraph', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <p>break</p>
      <ul>
        <li>b</li>
      </ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when separated by non-whitespace text', async () => {
    const value = '<ul><li>a</li></ul>between<ul><li>b</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when separated by a br', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <br>
      <ul>
        <li>b</li>
      </ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a single standalone list untouched', async () => {
    const value = '<ul><li>only</li></ul>'

    expect(await transform(value)).toBe(value)
  })

  it('should merge multiple independent runs in one pass', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
      <p>gap</p>
      <ul>
        <li>c</li>
      </ul>
      <ul>
        <li>d</li>
      </ul>
    `
    const expected = html`
      <ul>
        <li>a</li>
        <li>b</li>
      </ul>
      <p>gap</p>
      <ul>
        <li>c</li>
        <li>d</li>
      </ul>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve surrounding content', async () => {
    const value = html`
      <p>before</p>
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
      <p>after</p>
    `
    const expected = html`
      <p>before</p>
      <ul>
        <li>a</li>
        <li>b</li>
      </ul>
      <p>after</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave nested lists inside li untouched', async () => {
    const value = html`
      <ul>
        <li>outer<ul>
            <li>nested</li>
          </ul>
        </li>
      </ul>
      <ul>
        <li>sibling</li>
      </ul>
    `
    const expected = '<ul><li>outer<ul><li>nested</li></ul></li><li>sibling</li></ul>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not merge lists that contain direct text instead of <li>', async () => {
    const value = html`
      <ul>Item one</ul>
      <ul>Item two</ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not merge when one list contains direct text alongside valid lists', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ul>orphan text</ul>
      <ul>
        <li>c</li>
      </ul>
    `

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
    const value = html`
      <ul>
        <p>oops</p>
      </ul>
      <ul>
        <li>valid</li>
      </ul>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should handle the Dwell-style three-fragment case', async () => {
    const value = html`
      <div>
        <ul>
          <li>first item</li>
        </ul>
        <ul>
          <li>second item</li>
        </ul>
        <ul>
          <li>third item</li>
        </ul>
      </div>
    `
    const expected = html`
      <div>
        <ul>
          <li>first item</li>
          <li>second item</li>
          <li>third item</li>
        </ul>
      </div>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ul>
        <li>b</li>
      </ul>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
