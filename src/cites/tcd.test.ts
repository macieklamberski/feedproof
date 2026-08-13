import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { tcdCiteResolver } from './tcd.js'

describeForEachParser('tcdCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, tcdCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="cardlink">
          <a href="https://example.com/post">
            <div class="cardlink_thumbnail">
              <img src="https://example.com/thumb.jpg" alt="Page title" width="120" height="120">
            </div>
          </a>
          <div class="cardlink_content">
            <span class="cardlink_timestamp">2022.05.03</span>
            <div class="cardlink_title"><a href="https://example.com/post">Page title</a></div>
            <div class="cardlink_excerpt">Preview text</div>
          </div>
          <div class="cardlink_footer"></div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tcd',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        date: '2022.05.03',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the date from the bare timestamp class', async () => {
      const value = html`
        <div class="cardlink">
          <div class="cardlink_content">
            <span class="timestamp">2019.05.15</span>
            <div class="cardlink_title"><a href="https://example.com/post">Page title</a></div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tcd',
        url: 'https://example.com/post',
        title: 'Page title',
        date: '2019.05.15',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should find the thumbnail when the anchor carries the class itself', async () => {
      const value = html`
        <div class="cardlink">
          <a class="cardlink_thumbnail" href="https://example.com/post">
            <img src="https://example.com/thumb.jpg" width="120" height="120">
          </a>
          <div class="cardlink_content">
            <div class="cardlink_title"><a href="https://example.com/post">Page title</a></div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tcd',
        url: 'https://example.com/post',
        title: 'Page title',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="cardlink">
          <div class="cardlink_title"><a href="https://example.com/post">Page title</a></div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tcd',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title link has no href', async () => {
      const value = html`
        <div class="cardlink">
          <div class="cardlink_title"><a>Page title</a></div>
          <div class="cardlink_excerpt">Preview text</div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no title', async () => {
      const value = html`
        <div class="cardlink">
          <div class="cardlink_excerpt">Preview text</div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
