import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { swellCiteResolver } from './swell.js'

describeForEachParser('swellCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, swellCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="swell-block-postLink">
          <div class="p-blogCard -internal" data-type="type1" data-onclick="clickLink">
            <div class="p-blogCard__inner">
              <span class="p-blogCard__caption">Recommended reading</span>
              <div class="p-blogCard__thumb c-postThumb">
                <figure class="c-postThumb__figure">
                  <img
                    decoding="async"
                    src="https://example.com/thumb.jpg"
                    alt=""
                    class="c-postThumb__img u-obf-cover"
                    width="320"
                    height="180"
                  />
                </figure>
              </div>
              <div class="p-blogCard__body">
                <a class="p-blogCard__title" href="https://example.com/?page_id=1240">Post title</a>
                <span class="p-blogCard__excerpt">Preview text</span>
              </div>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'swell',
        url: 'https://example.com/?page_id=1240',
        title: 'Post title',
        description: 'Preview text',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an external card the same way as an internal one', async () => {
      const value = html`
        <div class="swell-block-postLink">
          <div class="p-blogCard -external" data-type="type1">
            <div class="p-blogCard__body">
              <a class="p-blogCard__title" href="https://example.com/post">Post title</a>
              <span class="p-blogCard__excerpt">Preview text</span>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="p-blogCard">
          <a class="p-blogCard__title" href="https://example.com/post">Post title</a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should drop the theme caption', async () => {
      const value = html`
        <div class="p-blogCard">
          <span class="p-blogCard__caption">Recommended reading</span>
          <a class="p-blogCard__title" href="https://example.com/post">Post title</a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'swell',
        url: 'https://example.com/post',
        title: 'Post title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div class="p-blogCard">
          <a class="p-blogCard__title" href="https://example.com/post"> Padded title </a>
        </div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title link has no href', async () => {
      const value = html`
        <div class="p-blogCard">
          <a class="p-blogCard__title">Post title</a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title link is missing', async () => {
      const value = html`
        <div class="p-blogCard">
          <span class="p-blogCard__excerpt">Preview text</span>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <div class="p-blogCard">
          <a class="p-blogCard__title" href="https://example.com/post"> </a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
