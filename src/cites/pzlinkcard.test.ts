import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { pzlinkcardCiteResolver } from './pzlinkcard.js'

describeForEachParser('pzlinkcardCiteResolver', (parseHtml) => {
  const extract = async (value: string): Promise<CiteResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(pzlinkcardCiteResolver.selector)
    return element ? await pzlinkcardCiteResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <a href="https://example.com/page" target="_blank" rel="external noopener">
          <div class="lkc-card">
            <div class="lkc-info">
              <img class="lkc-favicon" src="https://www.google.com/s2/favicons?domain=example.com" alt="" width="16" height="16" />
              <div class="lkc-domain">example.com</div>
              <div class="lkc-share">
                <div class="lkc-sns-fb">12 Shares</div>
                <div class="lkc-sns-hb">10 Users</div>
              </div>
            </div>
            <div class="lkc-content">
              <figure class="lkc-thumbnail"><img class="lkc-thumbnail-img" src="https://cdn.example.com/thumb.jpg" alt="" /></figure>
              <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
              <div class="lkc-excerpt">Preview text</div>
            </div>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'pzlinkcard',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://www.google.com/s2/favicons?domain=example.com',
        thumbnail: 'https://cdn.example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the wrapping url and title are present', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'pzlinkcard',
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
    it('should fall back to the title container when the title-text element is absent', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title">Page title</div>
          </div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Page title')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title"><div class="lkc-title-text"> Padded title </div></div>
          </div>
        </a>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when there is no wrapping link', async () => {
      const value = html`
        <div class="lkc-card">
          <div class="lkc-title"><div class="lkc-title-text">Page title</div></div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-excerpt">Preview text</div>
          </div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <a href="https://example.com/page">
          <div class="lkc-card">
            <div class="lkc-title"><div class="lkc-title-text"> </div></div>
          </div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
