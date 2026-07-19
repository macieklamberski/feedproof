import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { cocoonBookmarkResolver } from './cocoon.js'

describeForEachParser('cocoonBookmarkResolver', (parseHtml) => {
  const extract = async (value: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(cocoonBookmarkResolver.selector)
    return element ? await cocoonBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <a
          target="_blank"
          href="https://example.com/post"
          title="Post title"
          class="blogcard-wrap internal-blogcard-wrap a-wrap cf"
        >
          <div class="blogcard internal-blogcard ib-left cf">
            <figure class="blogcard-thumbnail internal-blogcard-thumbnail">
              <img
                width="160"
                height="90"
                src="https://example.com/thumb.jpg"
                class="blogcard-thumb-image internal-blogcard-thumb-image wp-post-image"
                alt=""
                srcset="https://example.com/thumb.jpg 160w, https://example.com/thumb-320.jpg 320w"
                sizes="(max-width: 160px) 100vw, 160px"
              />
            </figure>
            <div class="blogcard-content internal-blogcard-content">
              <div class="blogcard-title internal-blogcard-title">Post title</div>
              <div class="blogcard-snipet internal-blogcard-snipet">Preview text</div>
            </div>
            <div class="blogcard-footer internal-blogcard-footer cf">
              <div class="blogcard-site internal-blogcard-site">
                <div class="blogcard-favicon internal-blogcard-favicon">
                  <img
                    src="//www.google.com/s2/favicons?domain=example.com"
                    class="blogcard-favicon-image internal-blogcard-favicon-image"
                    alt=""
                    width="16"
                    height="16"
                  />
                </div>
                <div class="blogcard-domain internal-blogcard-domain">example.com</div>
              </div>
              <div class="blogcard-date internal-blogcard-date">
                <div class="blogcard-post-date internal-blogcard-post-date">2018.10.14</div>
              </div>
            </div>
          </div>
        </a>
      `
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        publisher: 'example.com',
        date: '2018.10.14',
        icon: '//www.google.com/s2/favicons?domain=example.com',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an external card the same way as an internal one', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap external-blogcard-wrap a-wrap cf">
          <div class="blogcard external-blogcard eb-left cf">
            <div class="blogcard-content external-blogcard-content">
              <div class="blogcard-title external-blogcard-title">Post title</div>
              <div class="blogcard-snippet external-blogcard-snippet">Preview text</div>
            </div>
          </div>
        </a>
      `
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        publisher: undefined,
        date: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only href and title are present', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-title">Post title</div>
        </a>
      `
      const expected: BookmarkResolverResult = {
        provider: 'cocoon',
        url: 'https://example.com/post',
        title: 'Post title',
        description: undefined,
        publisher: undefined,
        date: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the description from the misspelled snippet class', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-title">Post title</div>
          <div class="blogcard-snipet">Preview text</div>
        </a>
      `

      expect((await extract(value))?.description).toBe('Preview text')
    })

    it('should pass the date through in the theme format', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-title">Post title</div>
          <div class="blogcard-post-date">2018.10.14</div>
        </a>
      `

      expect((await extract(value))?.date).toBe('2018.10.14')
    })

    it('should fall back to the anchor title attribute when the title element is missing', async () => {
      const value = html`
        <a href="https://example.com/post" title="Title from attribute" class="blogcard-wrap">
          <div class="blogcard-snippet">Preview text</div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Title from attribute')
    })

    it('should prefer the title element over the anchor title attribute', async () => {
      const value = html`
        <a href="https://example.com/post" title="Title from attribute" class="blogcard-wrap">
          <div class="blogcard-title">Title from element</div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Title from element')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-title">&nbsp;Padded title&nbsp;</div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the href is missing', async () => {
      const value = html`
        <a class="blogcard-wrap">
          <div class="blogcard-title">Post title</div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no title is available', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-snippet">Preview text</div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <a href="https://example.com/post" class="blogcard-wrap">
          <div class="blogcard-title">&nbsp;</div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
