import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, queryElement } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripDuplicateTitleHeading } from './stripDuplicateTitleHeading.js'

describeForEachParser('stripDuplicateTitleHeading', (parseHtml) => {
  const transform = (value: string, context: TransformContext) => {
    return applyDomTransforms(parseHtml(value), [stripDuplicateTitleHeading(context)])
  }

  describe('happy paths', () => {
    it('should remove first H1 that exactly matches the title', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove first H2 when it matches the title', async () => {
      const value = html`
        <h2>Breaking News Today</h2>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading when title differs only by case', async () => {
      const value = html`
        <h1>BREAKING NEWS TODAY</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'breaking news today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading when title differs only by surrounding whitespace', async () => {
      const value = '<h1>\n  Breaking News Today\n</h1><p>Article body.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading containing inline formatting that matches title text', async () => {
      const value = html`
        <h1>The <em>real</em> story</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading when the title still carries HTML entities', async () => {
      const value = html`
        <h1>
          <b>
            <i>Let ‘em laugh</i>
          </b>
          <b>: Country’s last word 🪕</b>
        </h1>
        <p>Article body.</p>
      `
      const context: TransformContext = {
        ...baseContext,
        articleTitle: 'Let &lsquo;em laugh: Country&rsquo;s last word 🪕',
      }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading when the title itself carries inline markup', async () => {
      const value = html`
        <h1>The real story</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'The <em>real</em> story' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove heading when text has collapsed multi-space whitespace', async () => {
      const value = html`
        <h1>The   real   story</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'The real story' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should remove a run of headings that together spell the title', async () => {
      const value = html`
        <h2><span> Breaking News </span></h2>
        <h2><span> Today </span></h2>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = '<p>Article body.</p>'

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should only remove the first matching heading, not subsequent occurrences', async () => {
      const value = html`
        <h1>The Title</h1>
        <p>Body.</p>
        <h1>The Title</h1>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'The Title' }
      const expected = html`
        <p>Body.</p>
        <h1>The Title</h1>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content alone when title is undefined', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Article body.</p>
      `

      expect(await transform(value, baseContext)).toEqualHtml(value)
    })

    it('should leave content alone when title is empty string', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: '' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave content alone when title is whitespace only', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: '   ' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave content alone when first heading does not match title', async () => {
      const value = html`
        <h1>Different Heading</h1>
        <p>Article body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave content alone when document has no headings', async () => {
      const value = '<p>Article body without any heading.</p>'
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should not remove a later heading even if it matches when first does not', async () => {
      const value = html`
        <h1>Different</h1>
        <p>Body.</p>
        <h2>Breaking News Today</h2>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave a run of headings alone when together they overshoot the title', async () => {
      const value = html`
        <h1>Breaking News</h1>
        <h2>Today and Tomorrow</h2>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should not join headings across a paragraph between them', async () => {
      const value = html`
        <h1>Breaking News</h1>
        <p>Body.</p>
        <h2>Today</h2>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should skip removal when a heading in the run contains an img', async () => {
      const value = html`
        <h1>Breaking News</h1>
        <h2>Today<img src="logo.png">
        </h2>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should leave content alone when title differs by punctuation', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today!' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = html`
        <h1>Breaking News Today</h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const once = await transform(value, context)
      const twice = await transform(once, context)

      expect(twice).toEqualHtml(once)
    })

    it('should skip removal when the heading contains an img', async () => {
      const value = html`
        <h1>Logo<img src="logo.png">
        </h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Logo' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should skip removal when the heading contains a video', async () => {
      const value = html`
        <h1>Title<video src="x.mp4"></video>
        </h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Title' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should skip removal when the matching heading contains a nested heading', async () => {
      // Both parsers auto-close sibling headings when parsing HTML, so the
      // nested shape linkedom produces from broken markup is built via DOM.
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const document = parseHtml(html`
        <h2></h2>
        <p>Body.</p>
      `)
      const inner = document.createElement('h1')
      inner.textContent = 'Breaking News Today'
      queryElement(document, 'h2').appendChild(inner)
      const transforms = [stripDuplicateTitleHeading(context)]
      const expected = html`
        <h2>
          <h1>Breaking News Today</h1>
        </h2>
        <p>Body.</p>
      `

      expect(await applyDomTransforms(document, transforms)).toBe(expected)
    })

    it('should skip past leading empty heading to find the real matching one', async () => {
      // Mirrors the foster-parenting case where an orphan </h*> close tag
      // makes the parser inject an empty heading before the article body.
      const value = html`
        <h1></h1>
        <h1>Breaking News Today</h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = html`
        <h1></h1>
        <p>Body.</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })

    it('should leave content alone when all headings are empty', async () => {
      const value = html`
        <h1></h1>
        <h2>   </h2>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }

      expect(await transform(value, context)).toEqualHtml(value)
    })

    it('should skip past leading whitespace-only heading', async () => {
      const value = html`
        <h1>   </h1>
        <h1>Breaking News Today</h1>
        <p>Body.</p>
      `
      const context: TransformContext = { ...baseContext, articleTitle: 'Breaking News Today' }
      const expected = html`
        <h1>   </h1>
        <p>Body.</p>
      `

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })
})
