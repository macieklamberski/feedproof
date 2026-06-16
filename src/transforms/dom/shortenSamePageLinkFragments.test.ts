import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { shortenSamePageLinkFragments } from './shortenSamePageLinkFragments.js'

const context: TransformContext = { ...baseContext, baseUrl: 'https://thu-le.com/blog/post' }

describeForEachParser('shortenSamePageLinkFragments', (parseHtml) => {
  const transform = (html: string, ctx: TransformContext = context) => {
    return applyDomTransforms(parseHtml(html), [shortenSamePageLinkFragments(ctx)])
  }

  describe('shortens', () => {
    it('should shorten an absolute same-page link to a bare fragment', async () => {
      const value = '<p><a href="https://thu-le.com/blog/post#the-system">jump</a></p>'
      const expected = '<p><a href="#the-system">jump</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should shorten a protocol-relative same-page link', async () => {
      const value = '<p><a href="//thu-le.com/blog/post#sec">jump</a></p>'
      const expected = '<p><a href="#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should shorten the canonical heading-permalink anchor', async () => {
      const value =
        '<h2><a name="the-system" href="https://thu-le.com/blog/post#the-system"></a>The system</h2>'
      const expected = '<h2><a name="the-system" href="#the-system"></a>The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('leaves untouched', () => {
    it('should leave an off-page (different host) fragment link', async () => {
      const value = '<p><a href="https://other.com/page#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a same-host different-path fragment link', async () => {
      const value = '<p><a href="https://thu-le.com/blog/other-post#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an already-bare fragment', async () => {
      const value = '<p><a href="#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a link with no fragment', async () => {
      const value = '<p><a href="https://thu-le.com/blog/post">read</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should no-op when no baseUrl is set', async () => {
      const value = '<p><a href="https://thu-le.com/blog/post#sec">jump</a></p>'

      expect(await transform(value, baseContext)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <h2><a name="sec" href="https://thu-le.com/blog/post#sec"></a>Section</h2>
      <p><a href="https://other.com/page#x">out</a></p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
