import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { wrapCargoGalleryImages } from './wrapCargoGalleryImages.js'

describeForEachParser('wrapCargoGalleryImages', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [wrapCargoGalleryImages(baseContext)])
  }

  describe('wraps', () => {
    it('should wrap a bare cargo image in a figure', async () => {
      const value = '<img src="https://freight.cargo.site/i/aaa/piece.jpg">'
      const expected = '<figure><img src="https://freight.cargo.site/i/aaa/piece.jpg"></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap each image in its own figure, leaving caption and nav as siblings', async () => {
      const value =
        'Delta<img src="https://freight.cargo.site/i/aaa/1.jpg"><img src="https://freight.cargo.site/i/bbb/2.jpg">PREV NEXT'
      const expected =
        'Delta<figure><img src="https://freight.cargo.site/i/aaa/1.jpg"></figure><figure><img src="https://freight.cargo.site/i/bbb/2.jpg"></figure>PREV NEXT'

      expect(await transform(value)).toBe(expected)
    })

    it('should match a data-src cargo image', async () => {
      const value = '<img data-src="https://freight.cargo.site/i/aaa/1.jpg">'
      const expected = '<figure><img data-src="https://freight.cargo.site/i/aaa/1.jpg"></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap the enclosing textless link', async () => {
      const value = html`
        <a href="https://example.com/project">
          <img src="https://freight.cargo.site/i/aaa/1.jpg">
        </a>
      `
      const expected = html`
        <figure>
          <a href="https://example.com/project">
            <img src="https://freight.cargo.site/i/aaa/1.jpg">
          </a>
        </figure>
      `

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('leaves untouched', () => {
    it('should leave a non-cargo image', async () => {
      const value = '<img src="https://example.com/1.jpg">'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a cargo image already inside a figure', async () => {
      const value = '<figure><img src="https://freight.cargo.site/i/aaa/1.jpg"></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a cargo image inside a paragraph', async () => {
      const value = '<p>See <img src="https://freight.cargo.site/i/aaa/1.jpg"> here</p>'

      expect(await transform(value)).toBe(value)
    })
  })

  it('should be idempotent', async () => {
    const value =
      'Delta<img src="https://freight.cargo.site/i/aaa/1.jpg"><img src="https://freight.cargo.site/i/bbb/2.jpg">'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
