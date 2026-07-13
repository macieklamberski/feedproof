import { describe, expect, it } from 'bun:test'
import { parseHtml } from '../parsers/linkedom.js'
import type { GalleryResolverResult } from '../types.js'
import { wordpressGalleryResolver } from './wordpress.js'

const extract = async (html: string): Promise<GalleryResolverResult | undefined> => {
  const element = parseHtml(html).querySelector(wordpressGalleryResolver.selector)
  return element ? await wordpressGalleryResolver.extract(element) : undefined
}

describe('wordpressGalleryResolver', () => {
  describe('happy paths', () => {
    it('should extract items from a modern has-nested-images gallery', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images columns-2 is-cropped">
          <figure class="wp-block-image">
            <a href="https://example.com/a.jpg"><img src="https://example.com/a-1024.jpg" alt="Sunset"></a>
            <figcaption>Day one</figcaption>
          </figure>
          <figure class="wp-block-image"><img src="https://example.com/b-1024.jpg" alt="Beach"></figure>
          <figcaption class="blocks-gallery-caption">My trip</figcaption>
        </figure>
      `)
      const expected: GalleryResolverResult = {
        provider: 'wordpress',
        title: 'My trip',
        items: [
          {
            url: 'https://example.com/a-1024.jpg',
            fullUrl: 'https://example.com/a.jpg',
            alt: 'Sunset',
            caption: 'Day one',
          },
          {
            url: 'https://example.com/b-1024.jpg',
            fullUrl: undefined,
            alt: 'Beach',
            caption: undefined,
          },
        ],
      }

      expect(result).toEqual(expected)
      expect(result?.layout).toBeUndefined()
    })

    it('should extract items from a legacy blocks-gallery shape', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery columns-2 is-cropped">
          <ul class="blocks-gallery-grid">
            <li class="blocks-gallery-item">
              <figure>
                <a href="https://example.com/a.jpg"><img src="https://example.com/a-1024.jpg" alt="One"></a>
                <figcaption class="blocks-gallery-item__caption">First</figcaption>
              </figure>
            </li>
            <li class="blocks-gallery-item"><figure><img src="https://example.com/b-1024.jpg"></figure></li>
          </ul>
          <figcaption class="blocks-gallery-caption">Trip</figcaption>
        </figure>
      `)
      const expected: GalleryResolverResult = {
        provider: 'wordpress',
        title: 'Trip',
        items: [
          {
            url: 'https://example.com/a-1024.jpg',
            fullUrl: 'https://example.com/a.jpg',
            alt: 'One',
            caption: 'First',
          },
          {
            url: 'https://example.com/b-1024.jpg',
            fullUrl: undefined,
            alt: undefined,
            caption: undefined,
          },
        ],
      }

      expect(result).toEqual(expected)
    })

    it('should ignore a wrapping anchor that points at a page rather than an image', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><a href="https://example.com/post"><img src="https://example.com/a.jpg"></a></figure>
          <figure class="wp-block-image"><img src="https://example.com/b.jpg"></figure>
        </figure>
      `)

      expect(result?.items[0]?.fullUrl).toBeUndefined()
    })

    it('should skip <noscript> fallback images', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><img src="https://example.com/a.jpg"><noscript><img src="https://example.com/a.jpg"></noscript></figure>
          <figure class="wp-block-image"><img src="https://example.com/b.jpg"><noscript><img src="https://example.com/b.jpg"></noscript></figure>
        </figure>
      `)

      expect(result?.items.map((item) => item.url)).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ])
    })

    it('should skip images that have no src', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><img alt="no source"></figure>
          <figure class="wp-block-image"><img src="https://example.com/a.jpg"></figure>
          <figure class="wp-block-image"><img src="https://example.com/b.jpg"></figure>
        </figure>
      `)

      expect(result?.items.map((item) => item.url)).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ])
    })

    it('should ignore a blank gallery caption', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><img src="https://example.com/a.jpg"></figure>
          <figure class="wp-block-image"><img src="https://example.com/b.jpg"></figure>
          <figcaption class="blocks-gallery-caption">   </figcaption>
        </figure>
      `)

      expect(result?.title).toBeUndefined()
    })

    it('should leave the title undefined when the gallery has no caption', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><img src="https://example.com/a.jpg"></figure>
          <figure class="wp-block-image"><img src="https://example.com/b.jpg"></figure>
        </figure>
      `)

      expect(result?.title).toBeUndefined()
      expect(result?.items.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when fewer than two images are present', async () => {
      const result = await extract(`
        <figure class="wp-block-gallery has-nested-images">
          <figure class="wp-block-image"><img src="https://example.com/a.jpg"></figure>
        </figure>
      `)

      expect(result).toBeUndefined()
    })

    it('should return undefined when no gallery is present', async () => {
      expect(await extract('<p>Regular content</p>')).toBeUndefined()
    })
  })
})
