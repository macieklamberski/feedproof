import { describe, expect, it } from 'bun:test'
import { parseHtml } from '../parsers/linkedom.js'
import type { GalleryResolverResult } from '../types.js'
import { ghostGalleryResolver } from './ghost.js'

const extract = async (html: string): Promise<GalleryResolverResult | undefined> => {
  const element = parseHtml(html).querySelector(ghostGalleryResolver.selector)
  return element ? await ghostGalleryResolver.extract(element) : undefined
}

describe('ghostGalleryResolver', () => {
  describe('happy paths', () => {
    it('should extract images and the card caption', async () => {
      const result = await extract(`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-container">
            <div class="kg-gallery-row">
              <div class="kg-gallery-image"><img src="https://example.com/a.jpg" alt="One"></div>
              <div class="kg-gallery-image"><img src="https://example.com/b.jpg"></div>
            </div>
          </div>
          <figcaption class="kg-gallery-card-caption">Holiday snaps</figcaption>
        </figure>
      `)
      const expected: GalleryResolverResult = {
        provider: 'ghost',
        title: 'Holiday snaps',
        items: [
          { url: 'https://example.com/a.jpg', fullUrl: undefined, alt: 'One', caption: undefined },
          {
            url: 'https://example.com/b.jpg',
            fullUrl: undefined,
            alt: undefined,
            caption: undefined,
          },
        ],
      }

      expect(result).toEqual(expected)
    })

    it('should leave the title undefined when the card has no caption', async () => {
      const result = await extract(`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-container">
            <div class="kg-gallery-row">
              <div class="kg-gallery-image"><img src="https://example.com/a.jpg"></div>
              <div class="kg-gallery-image"><img src="https://example.com/b.jpg"></div>
            </div>
          </div>
        </figure>
      `)

      expect(result?.title).toBeUndefined()
      expect(result?.items.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when fewer than two images are present', async () => {
      const result = await extract(`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-image"><img src="https://example.com/a.jpg"></div>
        </figure>
      `)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no gallery is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
