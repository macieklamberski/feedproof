import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { shortenSamePageLinkFragments } from './shortenSamePageLinkFragments.js'

const context: TransformContext = { ...baseContext, baseUrl: 'https://example.com/blog/post' }

describeForEachParser('shortenSamePageLinkFragments', (parseHtml) => {
  const transform = (html: string, ctx: TransformContext = context) => {
    return applyDomTransforms(parseHtml(html), [shortenSamePageLinkFragments(ctx)])
  }

  describe('shortens', () => {
    it('should shorten an absolute same-page link to a bare fragment', async () => {
      const value = '<p><a href="https://example.com/blog/post#the-system">jump</a></p>'
      const expected = '<p><a href="#the-system">jump</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should shorten a protocol-relative same-page link', async () => {
      const value = '<p><a href="//example.com/blog/post#sec">jump</a></p>'
      const expected = '<p><a href="#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should shorten the canonical heading-permalink anchor', async () => {
      const value = html`
        <h2><a name="the-system" href="https://example.com/blog/post#the-system"></a>The system</h2>
      `
      const expected = '<h2><a name="the-system" href="#the-system"></a>The system</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('leaves untouched', () => {
    it('should leave an off-page (different host) fragment link', async () => {
      const value = '<p><a href="https://example.org/page#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a same-host different-path fragment link', async () => {
      const value = '<p><a href="https://example.com/blog/other-post#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an already-bare fragment', async () => {
      const value = '<p><a href="#sec">jump</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a link with no fragment', async () => {
      const value = '<p><a href="https://example.com/blog/post">read</a></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should no-op when no baseUrl is set', async () => {
      const value = '<p><a href="https://example.com/blog/post#sec">jump</a></p>'

      expect(await transform(value, baseContext)).toEqualHtml(value)
    })
  })

  describe('with sameSiteUrls', () => {
    const siteContext: TransformContext = {
      ...context,
      sameSiteUrls: ['https://example.com/longform'],
    }

    it('should shorten a link to another self page when its target is in the content', async () => {
      const value = html`
        <p><a href="https://example.com/longform#note-1">note</a></p>
        <div id="note-1">The note.</div>
      `
      const expected = '<p><a href="#note-1">note</a></p><div id="note-1">The note.</div>'

      expect(await transform(value, siteContext)).toEqualHtml(expected)
    })

    it('should match an a[name] target as well as an id', async () => {
      const value = html`
        <p><a href="https://example.com/longform#note-1">note</a></p><a name="note-1"></a>
      `
      const expected = '<p><a href="#note-1">note</a></p><a name="note-1"></a>'

      expect(await transform(value, siteContext)).toEqualHtml(expected)
    })

    it('should leave a self-page link whose target is absent from the content', async () => {
      const value = '<p><a href="https://example.com/longform#recent">all posts</a></p>'

      expect(await transform(value, siteContext)).toEqualHtml(value)
    })

    it('should leave a link to a non-self page even when its fragment id is in the content', async () => {
      const value = html`
        <p><a href="https://example.org/passage#note-1">verse</a></p>
        <div id="note-1">The note.</div>
      `

      expect(await transform(value, siteContext)).toEqualHtml(value)
    })

    it('should still shorten a link on the item permalink without needing a target', async () => {
      const value = '<p><a href="https://example.com/blog/post#sec">jump</a></p>'
      const expected = '<p><a href="#sec">jump</a></p>'

      expect(await transform(value, siteContext)).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <h2><a name="sec" href="https://example.com/blog/post#sec"></a>Section</h2>
      <p><a href="https://example.org/page#x">out</a></p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
