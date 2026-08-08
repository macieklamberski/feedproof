import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { GalleryItem, GalleryResolver } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertGalleries } from './convertGalleries.js'

// Collects every <img> in a `.gallery` element into items (two or more required).
const imageResolver: GalleryResolver = {
  selector: '.gallery',
  extract: (element) => {
    const items: Array<GalleryItem> = []

    for (const image of element.querySelectorAll('img')) {
      const url = image.getAttribute('src')

      if (url) {
        items.push({ url })
      }
    }

    if (items.length < 2) {
      return
    }

    return { provider: 'stub', items }
  },
}

describeForEachParser('convertGalleries', (parseHtml) => {
  const transform = (value: string, galleryResolvers: Array<GalleryResolver>) => {
    return applyDomTransforms(parseHtml(value), [
      convertGalleries({ ...baseContext, galleryResolvers }),
    ])
  }

  describe('happy paths', () => {
    it('should replace a matched element with a gallery placeholder', async () => {
      const value =
        '<div class="gallery"><img src="https://e.com/a.jpg"><img src="https://e.com/b.jpg"></div>'
      const result = await transform(value, [imageResolver])

      expect(result).toContain('data-gallery-provider="stub"')
      expect(result).toContain('data-gallery-items')
      expect(result).toContain('https://e.com/a.jpg')
      expect(result).toContain('https://e.com/b.jpg')
      expect(result).toContain('<figure><img src="https://e.com/a.jpg"></figure>')
      expect(result).not.toContain('class="gallery"')
    })

    it('should emit sibling placeholders for multiple matches', async () => {
      const value = html`
        <div class="gallery"><img src="https://e.com/1a.jpg"><img src="https://e.com/1b.jpg"></div>
        <div class="gallery"><img src="https://e.com/2a.jpg"><img src="https://e.com/2b.jpg"></div>
      `
      const result = await transform(value, [imageResolver])

      expect((result.match(/data-gallery-provider="/g) ?? []).length).toBe(2)
    })

    it('should emit data-gallery-layout for sliders only', async () => {
      const sliderResolver: GalleryResolver = {
        selector: '.slider',
        extract: () => {
          return {
            provider: 'stub',
            layout: 'slideshow',
            items: [{ url: 'https://e.com/a.jpg' }, { url: 'https://e.com/b.jpg' }],
          }
        },
      }
      const gridResolver: GalleryResolver = {
        selector: '.grid',
        extract: () => {
          return {
            provider: 'stub',
            items: [{ url: 'https://e.com/c.jpg' }, { url: 'https://e.com/d.jpg' }],
          }
        },
      }
      const value = '<div class="slider"></div><div class="grid"></div>'
      const result = await transform(value, [sliderResolver, gridResolver])

      expect(result).toContain('data-gallery-layout="slideshow"')
      expect((result.match(/data-gallery-layout/g) ?? []).length).toBe(1)
    })

    it('should run each resolver in the registry', async () => {
      const resolverA: GalleryResolver = {
        selector: '.a',
        extract: () => {
          return {
            provider: 'a',
            items: [{ url: 'https://a.com/1.jpg' }, { url: 'https://a.com/2.jpg' }],
          }
        },
      }
      const resolverB: GalleryResolver = {
        selector: '.b',
        extract: () => {
          return {
            provider: 'b',
            items: [{ url: 'https://b.com/1.jpg' }, { url: 'https://b.com/2.jpg' }],
          }
        },
      }
      const value = '<div class="a"></div><div class="b"></div>'
      const result = await transform(value, [resolverA, resolverB])

      expect(result).toContain('data-gallery-provider="a"')
      expect(result).toContain('data-gallery-provider="b"')
    })

    it('should render per-image captions in the fallback', async () => {
      const captionResolver: GalleryResolver = {
        selector: '.gallery',
        extract: () => {
          return {
            provider: 'stub',
            items: [
              { url: 'https://e.com/a.jpg', caption: 'First' },
              { url: 'https://e.com/b.jpg', caption: 'Second' },
            ],
          }
        },
      }
      const result = await transform('<div class="gallery"></div>', [captionResolver])

      expect(result).toContain('<figcaption>First</figcaption>')
      expect(result).toContain('<figcaption>Second</figcaption>')
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no resolver matches', async () => {
      const value = '<p>Regular content</p>'

      expect(await transform(value, [imageResolver])).toBe(value)
    })

    it('should skip elements when the resolver returns undefined', async () => {
      const value = '<div class="gallery"><img src="https://e.com/a.jpg"></div>'
      const result = await transform(value, [imageResolver])

      expect(result).not.toContain('data-gallery')
      expect(result).toContain('class="gallery"')
    })

    it('should be idempotent', async () => {
      const value =
        '<div class="gallery"><img src="https://e.com/a.jpg"><img src="https://e.com/b.jpg"></div>'
      const once = await transform(value, [imageResolver])
      const twice = await transform(once, [imageResolver])

      expect(twice).toBe(once)
    })
  })
})
