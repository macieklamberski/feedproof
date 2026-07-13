import { describe, expect, it } from 'bun:test'
import { parseHtml } from '../parsers/linkedom.js'
import type { GalleryResolverResult } from '../types.js'
import { coblocksGalleryResolver } from './coblocks.js'

const extract = async (html: string): Promise<GalleryResolverResult | undefined> => {
  const element = parseHtml(html).querySelector(coblocksGalleryResolver.selector)
  return element ? await coblocksGalleryResolver.extract(element) : undefined
}

const items = (...srcs: Array<string>): string =>
  srcs
    .map(
      (src) =>
        `<li class="coblocks-gallery--item"><figure class="coblocks-gallery--figure"><img src="${src}"></figure></li>`,
    )
    .join('')

const makeGallery = (variant: string, ...srcs: Array<string>): string =>
  `<div class="wp-block-coblocks-gallery-${variant}"><ul class="coblocks-gallery">${items(...srcs)}</ul></div>`

describe('coblocksGalleryResolver', () => {
  describe('happy paths', () => {
    it('should tag the carousel variant as a slideshow', async () => {
      const result = await extract(
        makeGallery('carousel', 'https://example.com/a.jpg', 'https://example.com/b.jpg'),
      )

      expect(result?.provider).toBe('wordpress')
      expect(result?.layout).toBe('slideshow')
      expect(result?.items.length).toBe(2)
    })

    it('should leave the layout undefined for non-carousel variants', async () => {
      const result = await extract(
        makeGallery('stacked', 'https://example.com/a.jpg', 'https://example.com/b.jpg'),
      )

      expect(result?.layout).toBeUndefined()
      expect(result?.items.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when fewer than two images are present', async () => {
      expect(await extract(makeGallery('stacked', 'https://example.com/a.jpg'))).toBeUndefined()
    })

    it('should return undefined when no gallery is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
