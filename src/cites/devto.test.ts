import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { devtoCiteResolver } from './devto.js'

describeForEachParser('devtoCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, devtoCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="crayons-card c-embed text-styles text-styles--secondary">
          <div class="c-embed__content">
            <div class="c-embed__cover">
              <a href="https://example.com/classes" class="c-link align-middle" rel="noopener noreferrer">
                <img alt="" src="https://media.example.com/cover.png" height="450" class="m-0" width="800" />
              </a>
            </div>
            <div class="c-embed__body">
              <h2 class="fs-xl lh-tight">
                <a href="https://example.com/classes" rel="noopener noreferrer" class="c-link">Page title</a>
              </h2>
              <p class="truncate-at-3">Preview text</p>
              <div class="color-secondary fs-s flex items-center">
                <img alt="favicon" class="c-embed__favicon m-0 mr-2 radius-0" src="https://media.example.com/favicon.png" width="32" height="32" />
                example.com
              </div>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/classes',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://media.example.com/favicon.png',
        thumbnail: 'https://media.example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page">Page title</a></h2>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/page',
        title: 'Page title',
        description: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should fall back to the cover link when the title has no href', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__cover"><a href="https://example.com/page"><img src="https://example.com/cover.png" /></a></div>
          <div class="c-embed__body">
            <h2>Page title</h2>
          </div>
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/page')
    })

    // Optional fields pass through raw; createPlaceholder trims every field when it
    // writes the attributes. Only the guard-checked title is trimmed in the resolver.
    it('should read the publisher from the text beside the favicon', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page">Page title</a></h2>
            <div class="color-secondary">
              <img class="c-embed__favicon" src="https://example.com/favicon.png" />
              example.com
            </div>
          </div>
        </div>
      `

      expect((await extract(value))?.publisher).toBe('example.com')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page"> Padded title </a></h2>
          </div>
        </div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no url is available', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2>Page title</h2>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <p>Preview text</p>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page"> </a></h2>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
