import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { GalleryResolverResult } from '../types.js'
import { jetpackSlideshowResolver } from './jetpack.js'

const slide = (src: string, alt = ''): string => {
  return `<li class="wp-block-jetpack-slideshow_slide swiper-slide"><figure><img class="wp-block-jetpack-slideshow_image" src="${src}" alt="${alt}"></figure></li>`
}

const makeSlideshow = (...slides: Array<string>): string => {
  return html`
    <div class="wp-block-jetpack-slideshow" data-effect="fade">
      <div class="wp-block-jetpack-slideshow_container swiper">
        <ul class="wp-block-jetpack-slideshow_swiper-wrapper swiper-wrapper">${slides.join('')}</ul>
        <a class="wp-block-jetpack-slideshow_button-prev swiper-button-prev" role="button"></a>
        <a class="wp-block-jetpack-slideshow_button-next swiper-button-next" role="button"></a>
        <div class="wp-block-jetpack-slideshow_pagination swiper-pagination"></div>
      </div>
    </div>
  `
}

describeForEachParser('jetpackSlideshowResolver', (parseHtml) => {
  const extract = async (value: string): Promise<GalleryResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(jetpackSlideshowResolver.selector)

    return element ? await jetpackSlideshowResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract slide images with a slideshow layout', async () => {
      const value = makeSlideshow(
        slide('https://example.com/s1.jpg', 'One'),
        slide('https://example.com/s2.jpg', 'Two'),
      )
      const expected: GalleryResolverResult = {
        provider: 'wordpress',
        layout: 'slideshow',
        items: [
          { url: 'https://example.com/s1.jpg', fullUrl: undefined, alt: 'One', caption: undefined },
          { url: 'https://example.com/s2.jpg', fullUrl: undefined, alt: 'Two', caption: undefined },
        ],
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore navigation and pagination (no images there)', async () => {
      const value = makeSlideshow(
        slide('https://example.com/s1.jpg'),
        slide('https://example.com/s2.jpg'),
      )
      const result = await extract(value)

      expect(result?.items.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when fewer than two slides are present', async () => {
      expect(await extract(makeSlideshow(slide('https://example.com/s1.jpg')))).toBeUndefined()
    })

    it('should return undefined when no slideshow is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
