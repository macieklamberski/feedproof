import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { resolveMediaDimensions } from './resolveMediaDimensions.js'

describeForEachParser('resolveMediaDimensions', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [resolveMediaDimensions(context)])
  }

  describe('promotion from own style', () => {
    it('should promote numeric style width and height to attributes on img', async () => {
      const value = '<img src="photo.jpg" style="width:300px;height:200px">'
      const expected =
        '<img src="photo.jpg" style="width:300px;height:200px" width="300" height="200">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should promote style dimensions on video', async () => {
      const value = '<video src="clip.mp4" style="width:640px;height:360px"></video>'
      const expected =
        '<video src="clip.mp4" style="width:640px;height:360px" width="640" height="360"></video>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should backfill only the missing attribute and keep the existing one', async () => {
      const value = '<img src="photo.jpg" width="640" style="height:480px">'
      const expected = '<img src="photo.jpg" width="640" style="height:480px" height="480">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should accept unitless style dimensions', async () => {
      const value = '<img src="photo.jpg" style="width:300;height:200">'
      const expected = '<img src="photo.jpg" style="width:300;height:200" width="300" height="200">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should round fractional style dimensions', async () => {
      const value = '<img src="photo.jpg" style="width:300.6px;height:200.2px">'
      const expected =
        '<img src="photo.jpg" style="width:300.6px;height:200.2px" width="301" height="200">'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('inheritance from picture', () => {
    it('should carry picture width/height attributes onto a dimensionless img', async () => {
      const value = html`
        <picture width="277" height="530">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg">
        </picture>
      `
      const expected = html`
        <picture width="277" height="530">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg" width="277" height="530">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should carry picture inline-style dimensions down as attributes', async () => {
      const value = html`
        <picture style="width:277px;height:530px">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg">
        </picture>
      `
      const expected = html`
        <picture style="width:277px;height:530px">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg" width="277" height="530">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should prefer source dimensions over the picture element', async () => {
      const value = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w" width="800" height="600">
          <img src="https://example.com/a.jpeg">
        </picture>
      `
      const expected = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w" width="800" height="600">
          <img src="https://example.com/a.jpeg" width="800" height="600">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not overwrite dimensions already on the img', async () => {
      const value = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg" width="640" height="480">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not carry a partial picture dimension', async () => {
      const value = html`
        <picture width="277">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should prefer the img own dimensions over the picture', async () => {
      const value = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg" style="width:300px;height:200px">
        </picture>
      `
      const expected = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg" style="width:300px;height:200px" width="300" height="200">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should be idempotent for picture inheritance', async () => {
      const value = html`
        <picture width="277" height="530">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/a.jpeg">
        </picture>
      `
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })

  describe('left unchanged', () => {
    it('should not touch an element that already has both attributes', async () => {
      const value =
        '<img src="photo.jpg" width="800" height="600" style="width:300px;height:200px">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote max-width/max-height/auto', async () => {
      const value =
        '<video src="clip.mp4" style="max-width:550px;height:auto;max-height:500px"></video>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote when only one dimension is present', async () => {
      const value = '<img src="photo.jpg" style="width:300px">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote non-pixel units', async () => {
      const value = '<img src="photo.jpg" style="width:50%;height:10em">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote zero dimensions', async () => {
      const value = '<img src="photo.jpg" style="width:0px;height:0px">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote tracking-pixel-sized dimensions', async () => {
      const value = '<img src="photo.jpg" style="width:2px;height:2px">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should ignore width/height appearing inside the src URL', async () => {
      const value = '<img src="https://example.com/a.jpg?width=430&height=300">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = '<img src="photo.jpg" style="width:300px;height:200px">'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
