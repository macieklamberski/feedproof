import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { GalleryResolverResult } from '../types.js'
import { ghostGalleryResolver } from './ghost.js'

describeForEachParser('ghostGalleryResolver', (parseHtml) => {
  const extract = async (value: string): Promise<GalleryResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(ghostGalleryResolver.selector)

    return element ? await ghostGalleryResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract images and the card caption', async () => {
      const value = html`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-container">
            <div class="kg-gallery-row">
              <div class="kg-gallery-image"><img src="https://example.com/a.jpg" alt="One"></div>
              <div class="kg-gallery-image"><img src="https://example.com/b.jpg"></div>
            </div>
          </div>
          <figcaption class="kg-gallery-card-caption">Holiday snaps</figcaption>
        </figure>
      `
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the title undefined when the card has no caption', async () => {
      const value = html`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-container">
            <div class="kg-gallery-row">
              <div class="kg-gallery-image"><img src="https://example.com/a.jpg"></div>
              <div class="kg-gallery-image"><img src="https://example.com/b.jpg"></div>
            </div>
          </div>
        </figure>
      `
      const result = await extract(value)

      expect(result?.title).toBeUndefined()
      expect(result?.items.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when fewer than two images are present', async () => {
      const value = html`
        <figure class="kg-card kg-gallery-card">
          <div class="kg-gallery-image"><img src="https://example.com/a.jpg"></div>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no gallery is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
