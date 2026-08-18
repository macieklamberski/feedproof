import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { demoteHeadings } from './demoteHeadings.js'

describeForEachParser('demoteHeadings', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [demoteHeadings(baseContext)])
  }

  describe('triggered when body contains <h1>', () => {
    it('should demote a lone <h1> to <h2>', async () => {
      const value = html`
        <h1>Section</h1>
        <p>Body</p>
      `
      const expected = html`
        <h2>Section</h2>
        <p>Body</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should shift every heading level down by one', async () => {
      const value = html`
        <h1>One</h1>
        <h2>Two</h2>
        <h3>Three</h3>
        <h4>Four</h4>
        <h5>Five</h5>
        <p>Body</p>
      `
      const expected = html`
        <h2>One</h2>
        <h3>Two</h3>
        <h4>Three</h4>
        <h5>Four</h5>
        <h6>Five</h6>
        <p>Body</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should leave <h6> as <h6>', async () => {
      const value = html`
        <h1>Top</h1>
        <h6>Bottom</h6>
      `
      const expected = html`
        <h2>Top</h2>
        <h6>Bottom</h6>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve attributes when rewriting', async () => {
      const value = '<h1 id="intro" class="lead" data-x="1">Title</h1>'
      const expected = '<h2 id="intro" class="lead" data-x="1">Title</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve inner markup and text', async () => {
      const value = '<h1>Hello <em>world</em> and <a href="/x">link</a></h1>'
      const expected = '<h2>Hello <em>world</em> and <a href="/x">link</a></h2>'

      expect(await transform(value)).toBe(expected)
    })

    it('should demote every heading even when multiple <h1>s appear', async () => {
      const value = html`
        <h1>First</h1>
        <p>Body</p>
        <h1>Second</h1>
        <h2>Sub</h2>
      `
      const expected = html`
        <h2>First</h2>
        <p>Body</p>
        <h2>Second</h2>
        <h3>Sub</h3>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should handle headings nested inside other elements', async () => {
      const value = '<section><h1>Inside</h1><p>Body</p></section>'
      const expected = '<section><h2>Inside</h2><p>Body</p></section>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('skipped when body has no <h1>', () => {
    it('should leave <h2>-rooted hierarchy untouched', async () => {
      const value = html`
        <h2>Top</h2>
        <h3>Sub</h3>
        <p>Body</p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a body with no headings untouched', async () => {
      const value = html`
        <p>Just text</p>
        <p>More text</p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a lone <h3> alone', async () => {
      const value = '<h3>Standalone</h3>'

      expect(await transform(value)).toBe(value)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <h1>Section</h1>
      <p>Body</p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
