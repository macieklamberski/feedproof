import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { notecomCiteResolver } from './notecom.js'

describeForEachParser('notecomCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, notecomCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <figure embedded-service="external-article" contenteditable="false" embedded-content-key="emb123" data-identifier="null">
          <div class="fude-iframe-container">
            <div class="fude-iframe-container-external-article">
              <div class="widget-cover">
                <div class="external-article-widget">
                  <a href="https://example.com/page" target="_blank" rel="nofollow">
                    <strong class="external-article-widget-title">Page title</strong>
                    <em class="external-article-widget-description">Preview text</em>
                    <em class="external-article-widget-url">example.com</em>
                  </a>
                  <a class="external-article-widget-image" href="https://example.com/page" style="background-image: url('https://cdn.example.com/thumb.png');" target="_blank"></a>
                </div>
              </div>
            </div>
          </div>
        </figure>
      `
      const expected: CiteResolverResult = {
        provider: 'notecom',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://cdn.example.com/thumb.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the description undefined when the element is empty', async () => {
      const value = html`
        <figure embedded-service="external-article">
          <div class="external-article-widget">
            <a href="https://example.com/page">
              <strong class="external-article-widget-title">Page title</strong>
              <em class="external-article-widget-description"></em>
              <em class="external-article-widget-url">example.com</em>
            </a>
          </div>
        </figure>
      `
      const expected: CiteResolverResult = {
        provider: 'notecom',
        url: 'https://example.com/page',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should parse the thumbnail from the background-image style', async () => {
      const value = html`
        <figure embedded-service="external-article">
          <div class="external-article-widget">
            <a href="https://example.com/page"><strong class="external-article-widget-title">Page title</strong></a>
            <a class="external-article-widget-image" style="background-image: url(https://cdn.example.com/thumb.jpg);"></a>
          </div>
        </figure>
      `

      expect((await extract(value))?.thumbnail).toBe('https://cdn.example.com/thumb.jpg')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <figure embedded-service="external-article">
          <div class="external-article-widget">
            <a href="https://example.com/page"><strong class="external-article-widget-title"> Padded title </strong></a>
          </div>
        </figure>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title is missing (e.g. a shopping card)', async () => {
      const value = html`
        <figure embedded-service="external-article">
          <div class="external-article-widget--type_shopping">
            <a href="https://example.com/product">
              <em class="external-article-widget-productImage-price">1000</em>
            </a>
          </div>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no link', async () => {
      const value = html`
        <figure embedded-service="external-article">
          <div class="external-article-widget">
            <strong class="external-article-widget-title">Page title</strong>
          </div>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match an internal note embed', async () => {
      const value = html`<figure embedded-service="note" data-src="https://note.com/x/n/y"></figure>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})
