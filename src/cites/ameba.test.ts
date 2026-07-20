import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { amebaCiteResolver } from './ameba.js'

describeForEachParser('amebaCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, amebaCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="ogpCard_root">
          <article class="ogpCard_wrap" contenteditable="false">
            <a class="ogpCard_link" href="https://example.com/product" target="_blank" rel="noopener noreferrer" data-ogp-card-log="">
              <span class="ogpCard_imageWrap"><img class="ogpCard_image" src="https://cdn.example.com/thumb.jpg" alt="" /></span>
              <span class="ogpCard_content">
                <span class="ogpCard_title">Page title</span>
                <span class="ogpCard_description">Preview text</span>
                <span class="ogpCard_url">
                  <span class="ogpCard_iconWrap"><img class="ogpCard_icon" alt="link" src="https://c.stat100.ameba.jp/ameblo/symbols/editor_link.svg" /></span>
                  <span class="ogpCard_urlText">example.com</span>
                </span>
              </span>
            </a>
          </article>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'ameba',
        url: 'https://example.com/product',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://cdn.example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a card without a thumbnail image', async () => {
      const value = html`
        <article class="ogpCard_wrap">
          <a class="ogpCard_link" href="https://example.com/shop" data-ogp-card-log="">
            <span class="ogpCard_content">
              <span class="ogpCard_title">Page title</span>
              <span class="ogpCard_description">Preview text</span>
              <span class="ogpCard_url">
                <span class="ogpCard_iconWrap"><img class="ogpCard_icon" src="https://c.stat100.ameba.jp/ameblo/symbols/editor_link.svg" /></span>
                <span class="ogpCard_urlText">example.com</span>
              </span>
            </span>
          </a>
        </article>
      `
      const expected: CiteResolverResult = {
        provider: 'ameba',
        url: 'https://example.com/shop',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should not map the decorative link icon as an icon', async () => {
      const value = html`
        <article class="ogpCard_wrap">
          <a class="ogpCard_link" href="https://example.com/page">
            <span class="ogpCard_content">
              <span class="ogpCard_title">Page title</span>
              <span class="ogpCard_url">
                <span class="ogpCard_iconWrap"><img class="ogpCard_icon" src="https://c.stat100.ameba.jp/ameblo/symbols/editor_link.svg" /></span>
                <span class="ogpCard_urlText">example.com</span>
              </span>
            </span>
          </a>
        </article>
      `

      expect((await extract(value))?.icon).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the link has no href', async () => {
      const value = html`
        <article class="ogpCard_wrap">
          <a class="ogpCard_link">
            <span class="ogpCard_title">Page title</span>
          </a>
        </article>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <article class="ogpCard_wrap">
          <a class="ogpCard_link" href="https://example.com/page">
            <span class="ogpCard_description">Preview text</span>
          </a>
        </article>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
