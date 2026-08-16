import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { resolveMediaDimensions } from './resolveMediaDimensions.js'

describeForEachParser('resolveMediaDimensions', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [resolveMediaDimensions(context)])
  }

  describe('promotion from own style', () => {
    it('should promote numeric style width and height to attributes on img', async () => {
      const value = '<img src="photo.jpg" style="width:300px;height:200px">'
      const expected = html`
        <img src="photo.jpg" style="width:300px;height:200px" width="300" height="200">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should promote style dimensions on video', async () => {
      const value = '<video src="clip.mp4" style="width:640px;height:360px"></video>'
      const expected = html`
        <video src="clip.mp4" style="width:640px;height:360px" width="640" height="360"></video>
      `

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
      const expected = html`
        <img src="photo.jpg" style="width:300.6px;height:200.2px" width="301" height="200">
      `

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

  describe('inheritance from src URL', () => {
    it('should read dimensions from a filename suffix', async () => {
      const value = '<img src="https://example.com/photo-800x600.jpg">'
      const expected = '<img src="https://example.com/photo-800x600.jpg" width="800" height="600">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read dimensions from width/height query params', async () => {
      const value = '<img src="https://example.com/p.jpg?width=800&height=600">'
      const expected = html`
        <img src="https://example.com/p.jpg?width=800&height=600" width="800" height="600">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read dimensions from w/h query params', async () => {
      const value = '<img src="https://example.com/p.png?w=696&h=566">'
      const expected = '<img src="https://example.com/p.png?w=696&h=566" width="696" height="566">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read dimensions from an s=WxH param', async () => {
      const value = '<img src="https://example.com/p.jpg?s=612x612&w=0">'
      const expected = html`
        <img src="https://example.com/p.jpg?s=612x612&w=0" width="612" height="612">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should scale a declared height by the URL aspect ratio', async () => {
      const value = '<img src="https://example.com/xml-480x512.png" height="60">'
      const expected = '<img src="https://example.com/xml-480x512.png" height="60" width="56">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should scale a declared width by the URL aspect ratio', async () => {
      const value = '<img src="https://example.com/photo-800x600.jpg" width="400">'
      const expected = '<img src="https://example.com/photo-800x600.jpg" width="400" height="300">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should prefer own style dimensions over the URL', async () => {
      const value = html`
        <img src="https://example.com/photo-800x600.jpg" style="width:300px;height:200px">
      `
      const expected = html`
        <img
          src="https://example.com/photo-800x600.jpg"
          style="width:300px;height:200px"
          width="300"
          height="200"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should prefer URL dimensions over the wrapping picture', async () => {
      const value = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/photo-800x600.jpg">
        </picture>
      `
      const expected = html`
        <picture width="100" height="100">
          <source type="image/webp" srcset="https://example.com/a.webp 1000w">
          <img src="https://example.com/photo-800x600.jpg" width="800" height="600">
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not read dimensions from a data: placeholder src', async () => {
      const value = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote a tracking-pixel-sized URL', async () => {
      const value = '<img src="https://example.com/spacer-1x1.gif">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote when the URL has a width but no height', async () => {
      const value = '<img src="https://example.com/p.jpg?w=800">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an image whose URL has no size', async () => {
      const value = '<img src="https://example.com/plain.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('left unchanged', () => {
    it('should not touch an element that already has both attributes', async () => {
      const value = html`
        <img src="photo.jpg" width="800" height="600" style="width:300px;height:200px">
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote max-width/max-height/auto', async () => {
      const value = html`
        <video src="clip.mp4" style="max-width:550px;height:auto;max-height:500px"></video>
      `

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
  })

  describe('invalid attribute values', () => {
    it('should drop an auto width on video', async () => {
      const value = html`
        <video src="https://example.com/clip.mp4" width="auto" style="width:100%"></video>
      `
      const expected = '<video src="https://example.com/clip.mp4" style="width:100%"></video>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop an auto height', async () => {
      const value = '<img src="https://example.com/p.jpg" height="auto">'
      const expected = '<img src="https://example.com/p.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop a percentage width', async () => {
      const value = '<img src="https://example.com/p.jpg" width="100%">'
      const expected = '<img src="https://example.com/p.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should drop a zero width', async () => {
      const value = '<img src="https://example.com/p.jpg" width="0">'
      const expected = '<img src="https://example.com/p.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should backfill from the URL after dropping an auto width', async () => {
      const value = '<img src="https://example.com/photo-800x600.jpg" width="auto">'
      const expected = '<img src="https://example.com/photo-800x600.jpg" width="800" height="600">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep valid integer attributes', async () => {
      const value = '<img src="https://example.com/p.jpg" width="800" height="600">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('inheritance from srcset URL', () => {
    it('should read dimensions from the widest srcset candidate when there is no src', async () => {
      const value = html`
        <img
          srcset="https://example.com/p-400x300.jpg 400w, https://example.com/p-800x600.jpg 800w"
        >
      `
      const expected = html`
        <img
          srcset="https://example.com/p-400x300.jpg 400w, https://example.com/p-800x600.jpg 800w"
          width="800"
          height="600"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should prefer src dimensions over srcset', async () => {
      const value = html`
        <img
          src="https://example.com/p-300x200.jpg"
          srcset="https://example.com/p-800x600.jpg 800w"
        >
      `
      const expected = html`
        <img
          src="https://example.com/p-300x200.jpg"
          srcset="https://example.com/p-800x600.jpg 800w"
          width="300"
          height="200"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should pick the widest candidate regardless of order', async () => {
      const value = html`
        <img
          srcset="https://example.com/p-800x600.jpg 800w, https://example.com/p-400x300.jpg 400w"
        >
      `
      const expected = html`
        <img
          srcset="https://example.com/p-800x600.jpg 800w, https://example.com/p-400x300.jpg 400w"
          width="800"
          height="600"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave dimensions unset for an unparseable srcset', async () => {
      const value = '<img srcset=" ">'

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
