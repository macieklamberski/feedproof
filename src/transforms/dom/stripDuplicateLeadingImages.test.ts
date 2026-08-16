import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripDuplicateLeadingImages } from './stripDuplicateLeadingImages.js'

describeForEachParser('stripDuplicateLeadingImages', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripDuplicateLeadingImages(context)])
  }

  describe('removal', () => {
    it('should remove a leading image repeated as the next image', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <p>
          <img src="https://example.com/uploads/photo.jpg">
        </p>
        <p>Content</p>
      `
      const expected = html`
        <p>
          <img src="https://example.com/uploads/photo.jpg">
        </p>
        <p>Content</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a sized repeat and keep the unscaled leading original', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg" width="1280" height="853">
        <p>
          <img src="https://example.com/uploads/photo-900x600.jpg" width="900" height="600">
        </p>
      `
      const expected = html`
        <img src="https://example.com/uploads/photo.jpg" width="1280" height="853">
        <p></p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a sized leading image and keep the unscaled repeat', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo-500x333.jpg">
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the larger copy when both are sized variants of one file', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo-577x1024.jpg">
        <img src="https://example.com/uploads/photo-169x300.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo-577x1024.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the leading original over an underscore sized repeat', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <img src="https://example.com/uploads/photo_800x450.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the larger size-keyword variant even when it leads', async () => {
      const value = html`
        <img src="https://example.com/photos/123/large.jpg">
        <img src="https://example.com/photos/123/small.jpg">
      `
      const expected = '<img src="https://example.com/photos/123/large.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the larger size-keyword variant when it comes second', async () => {
      const value = html`
        <img src="https://example.com/photos/123/small.jpg">
        <img src="https://example.com/photos/123/large.jpg">
      `
      const expected = '<img src="https://example.com/photos/123/large.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a leading image whose repeat differs only by query render params', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg?w=1024">
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a leading image whose repeat hides behind an image proxy', async () => {
      const value = html`
        <img src="https://i0.wp.com/example.com/uploads/photo.jpg">
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a leading image whose repeat differs only by protocol', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <img src="http://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="http://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should collapse a run of identical leading images to the last one', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <img src="https://example.com/uploads/photo-800x450.jpg">
        <img src="https://example.com/uploads/photo.jpg">
        <p>Content</p>
      `
      const expected = html`
        <img src="https://example.com/uploads/photo.jpg">
        <p>Content</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave the emptied paragraph for stripEmptyTags downstream', async () => {
      const value = html`
        <p>
          <img src="https://example.com/uploads/photo.jpg">
        </p>
        <p>
          <img src="https://example.com/uploads/photo.jpg"> Caption</p>
      `
      const expected = html`
        <p></p>
        <p>
          <img src="https://example.com/uploads/photo.jpg"> Caption</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove an emptied link wrapper along with the leading image', async () => {
      const value = html`
        <a href="https://example.com/post">
          <img src="https://example.com/uploads/photo.jpg">
        </a>
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove the leading image with text between the two copies', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <p>Photo credit: someone.</p>
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = html`
        <p>Photo credit: someone.</p>
        <img src="https://example.com/uploads/photo.jpg">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('kept content', () => {
    it('should keep distinct images', async () => {
      const value = html`
        <img src="https://example.com/uploads/one.jpg">
        <img src="https://example.com/uploads/two.jpg">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a single image', async () => {
      const value = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a repeat deeper in the body', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo.jpg">
        <img src="https://example.com/uploads/other.jpg">
        <img src="https://example.com/uploads/photo.jpg">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep an inner duplicate that does not involve the leading image', async () => {
      const value = html`
        <img src="https://example.com/uploads/one.jpg">
        <img src="https://example.com/uploads/two.jpg">
        <img src="https://example.com/uploads/two.jpg">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a bare keyword beside a dimension-suffixed keyword variant', async () => {
      // The two fingerprint differently (the directory vs .../large.jpg), so the pair
      // never matches. Deliberate: the size signals cannot rank this shape correctly,
      // and a wrong removal would delete content where a kept duplicate only renders
      // twice.
      const value = html`
        <img src="https://example.com/photos/123/small.jpg">
        <img src="https://example.com/photos/123/large-800x600.jpg">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep different photos sharing the same size suffix', async () => {
      const value = html`
        <img src="https://example.com/uploads/one-800x450.jpg">
        <img src="https://example.com/uploads/two-800x450.jpg">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep distinct images served by a script endpoint', async () => {
      const value = html`
        <img src="https://example.com/download/file.php?id=119394">
        <img src="https://example.com/download/file.php?id=119393">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a document with no images', async () => {
      const value = '<p>Content</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <img src="https://example.com/uploads/photo.jpg">
      <img src="https://example.com/uploads/photo.jpg">
      <p>Content</p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
