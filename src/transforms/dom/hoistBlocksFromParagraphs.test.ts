import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { hoistBlocksFromParagraphs } from './hoistBlocksFromParagraphs.js'

describeForEachParser('hoistBlocksFromParagraphs', (parseHtml) => {
  // Both parsers close the paragraph themselves when they read `<p><div>`, so the nesting
  // this transform fixes cannot be written as a fixture. It only ever arises after
  // parsing, when a transform swaps an inline element for a block through the DOM API,
  // which enforces no nesting rules. `<i class="marker">` stands in for whatever such a
  // transform matched, and is swapped the same way here.
  const transform = (value: string, tag = 'div') => {
    const document = parseHtml(value)

    for (const marker of document.querySelectorAll('i.marker')) {
      const block = document.createElement(tag)
      block.setAttribute('data-block', '')
      block.textContent = marker.textContent
      marker.replaceWith(block)
    }

    return applyDomTransforms(document, [hoistBlocksFromParagraphs(baseContext)])
  }

  describe('happy paths', () => {
    it('should hoist a block out of an otherwise empty paragraph', async () => {
      const value = '<p><i class="marker">Block</i></p>'
      const expected = '<div data-block="">Block</div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should split the paragraph around the block', async () => {
      const value = '<p>Watch this: <i class="marker">Block</i> and enjoy.</p>'
      const expected = html`
        <p>Watch this: </p>
        <div data-block="">Block</div>
        <p> and enjoy.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should carry the paragraph attributes onto both halves', async () => {
      const value = html`
        <p
          dir="rtl"
          class="lead"
        >Before <i class="marker">Block</i> after</p>
      `
      const expected = html`
        <p dir="rtl" class="lead">Before </p>
        <div data-block="">Block</div>
        <p dir="rtl" class="lead"> after</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should hoist a block other than a div', async () => {
      const value = '<p>Run <i class="marker">code</i> now</p>'
      const expected = html`
        <p>Run </p>
        <pre data-block="">code</pre>
        <p> now</p>
      `

      expect(await transform(value, 'pre')).toEqualHtml(expected)
    })

    it('should split every paragraph holding a block', async () => {
      const value = html`
        <p>One <i class="marker">A</i> end</p>
        <p>Two <i class="marker">B</i> end</p>
      `
      const expected = html`
        <p>One </p>
        <div data-block="">A</div>
        <p> end</p>
        <p>Two </p>
        <div data-block="">B</div>
        <p> end</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('inline ancestors', () => {
    it('should split through an inline ancestor without keeping its husk', async () => {
      const value = '<p>Before <em>emphasised <i class="marker">Block</i> after</em>.</p>'
      const expected = html`
        <p>Before <em>emphasised </em>
        </p>
        <div data-block="">Block</div>
        <p>
          <em> after</em>.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop an inline wrapper the block emptied', async () => {
      const value = '<p>Before <em><i class="marker">Block</i></em> after.</p>'
      const expected = html`
        <p>Before </p>
        <div data-block="">Block</div>
        <p> after.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should walk husk removal up through nested emptied wrappers', async () => {
      const value = '<p>Before <em><span><i class="marker">Block</i></span></em> after.</p>'
      const expected = html`
        <p>Before </p>
        <div data-block="">Block</div>
        <p> after.</p>
      `

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave a block outside any paragraph alone', async () => {
      const value = '<div><i class="marker">Block</i></div>'
      const expected = '<div><div data-block="">Block</div></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should drop the trailing half when nothing renderable follows', async () => {
      const value = '<p>Watch this: <i class="marker">Block</i> </p>'
      const expected = html`
        <p>Watch this: </p>
        <div data-block="">Block</div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should keep a trailing half holding only media', async () => {
      const value = '<p>Before <i class="marker">Block</i> <img src="a.jpg"></p>'
      const expected = html`
        <p>Before </p>
        <div data-block="">Block</div>
        <p> <img src="a.jpg">
        </p>
      `

      expect(await transform(value)).toBe(expected)
    })

    // Both blocks match the selector, so the inner one gets its turn after the outer has
    // already carried it out of the paragraph.
    it('should hoist a block holding another block only once', async () => {
      const value = '<p>Before <i class="marker">Block</i> after</p>'
      const document = parseHtml(value)
      const marker = document.querySelector('i.marker')

      if (!marker) {
        throw new Error('Missing marker')
      }

      const outer = document.createElement('div')
      outer.setAttribute('data-block', '')
      outer.innerHTML = '<div data-inner="">Inner</div>'
      marker.replaceWith(outer)

      const expected = html`
        <p>Before </p>
        <div data-block="">
          <div data-inner="">Inner</div>
        </div>
        <p> after</p>
      `
      const result = await applyDomTransforms(document, [hoistBlocksFromParagraphs(baseContext)])

      expect(result).toEqualHtml(expected)
    })

    it('should be idempotent', async () => {
      const value = '<p>Intro <i class="marker">Block</i> outro</p>'
      const once = await transform(value)
      const twice = await applyDomTransforms(parseHtml(once), [
        hoistBlocksFromParagraphs(baseContext),
      ])

      expect(twice).toBe(once)
    })
  })
})
