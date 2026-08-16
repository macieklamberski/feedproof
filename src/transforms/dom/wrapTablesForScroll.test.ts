import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { wrapTablesForScroll } from './wrapTablesForScroll.js'

describeForEachParser('wrapTablesForScroll', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [wrapTablesForScroll(context)])
  }

  describe('happy paths', () => {
    it('should wrap a table in a div data-table', async () => {
      const value = '<table><tbody><tr><td>Cell</td></tr></tbody></table>'
      const expected = html`
        <div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap multiple sibling tables independently', async () => {
      const value = html`
        <table><tbody><tr><td>A</td></tr></tbody></table>
        <table><tbody><tr><td>B</td></tr></tbody></table>
      `
      const expected = html`
        <div data-table=""><table><tbody><tr><td>A</td></tr></tbody></table></div>
        <div data-table=""><table><tbody><tr><td>B</td></tr></tbody></table></div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve the table attributes and inner markup', async () => {
      const value = '<table class="data" id="t1"><thead><tr><th>H</th></tr></thead></table>'
      const expected = html`
        <div data-table=""><table class="data" id="t1"><thead><tr><th>H</th></tr></thead></table>
        </div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should keep surrounding content intact', async () => {
      const value = html`
        <p>Before</p>
        <table><tbody><tr><td>X</td></tr></tbody></table>
        <p>After</p>
      `
      const expected = html`
        <p>Before</p>
        <div data-table=""><table><tbody><tr><td>X</td></tr></tbody></table></div>
        <p>After</p>
      `

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content without tables unchanged', async () => {
      const value = '<p>No tables here</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<table><tbody><tr><td>Cell</td></tr></tbody></table>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should not stack wrappers when applied multiple times to the same document', async () => {
      const value = '<table><tbody><tr><td>Cell</td></tr></tbody></table>'
      const expected = html`
        <div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>
      `
      const context = baseContext
      const result = await applyDomTransforms(parseHtml(value), [
        wrapTablesForScroll(context),
        wrapTablesForScroll(context),
        wrapTablesForScroll(context),
      ])

      expect(result).toBe(expected)
    })

    it('should not re-wrap a table already in a div data-table', async () => {
      const value = '<div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody></table></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should add its own wrapper around a table inside an author div', async () => {
      const value = html`
        <div class="responsive"><table><tbody><tr><td>Cell</td></tr></tbody></table></div>
      `
      const expected = html`
        <div class="responsive"><div data-table=""><table><tbody><tr><td>Cell</td></tr></tbody>
        </table></div></div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap only the outer table when tables are nested', async () => {
      const value = html`
        <table><tbody><tr><td><table><tbody><tr><td>Inner</td></tr></tbody></table></td></tr>
        </tbody></table>
      `
      const expected = html`
        <div data-table=""><table><tbody><tr><td><table><tbody><tr><td>Inner</td></tr></tbody>
        </table></td></tr></tbody></table></div>
      `

      expect(await transform(value)).toBe(expected)
    })
  })
})
