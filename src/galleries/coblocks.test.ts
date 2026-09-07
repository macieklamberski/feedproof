import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { GalleryResolverResult } from '../types.js'
import { coblocksGalleryResolver } from './coblocks.js'

const galleryItems = (...sources: Array<string>): string => {
  return sources
    .map((source) => {
      return `<li class="coblocks-gallery--item"><figure class="coblocks-gallery--figure"><img src="${source}"></figure></li>`
    })
    .join('')
}

const makeGallery = (variant: string, ...sources: Array<string>): string => {
  return `<div class="wp-block-coblocks-gallery-${variant}"><ul class="coblocks-gallery">${galleryItems(...sources)}</ul></div>`
}

describeForEachParser('coblocksGalleryResolver', (parseHtml) => {
  const extract = async (value: string): Promise<GalleryResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(coblocksGalleryResolver.selector)

    return element ? await coblocksGalleryResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should tag the carousel variant as a slideshow', async () => {
      const value = makeGallery(
        'carousel',
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      )
      const result = await extract(value)

      expect(result).toMatchObject({
        provider: 'wordpress',
        layout: 'slideshow',
      })
      expect(result?.items.length).toBe(2)
    })

    it('should leave the layout undefined for non-carousel variants', async () => {
      const value = makeGallery('stacked', 'https://example.com/a.jpg', 'https://example.com/b.jpg')
      const result = await extract(value)

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
