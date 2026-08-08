import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { xenforoCiteResolver } from './xenforo.js'

describeForEachParser('xenforoCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, xenforoCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div
          class="bbCodeBlock bbCodeBlock--unfurl js-unfurl fauxBlockLink"
          data-unfurl="true"
          data-result-id="6548"
          data-url="https://example.com/profile.php?id=615739"
          data-host="example.com"
          data-pending="false"
        >
          <div class="contentRow">
            <div class="contentRow-figure contentRow-figure--fixedSmall js-unfurl-figure">
              <img src="https://cdn.example.net/thumb.jpg?ccb=1-7" alt="example.com" data-onerror="hide-parent" />
            </div>
            <div class="contentRow-main">
              <h3 class="contentRow-header js-unfurl-title">
                <a href="https://example.com/profile.php?id=615739" class="link link--external fauxBlockLink-blockLink" target="_blank" rel="nofollow ugc noopener" data-proxy-href="">Page title</a>
              </h3>
              <div class="contentRow-snippet js-unfurl-desc">Preview text</div>
              <div class="contentRow-minor contentRow-minor--hideLinks">
                <span class="js-unfurl-favicon">
                  <img src="https://static.example.net/favicon.ico" alt="example.com" class="bbCodeBlockUnfurl-icon" data-onerror="hide-parent" />
                </span>
                example.com
              </div>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'xenforo',
        url: 'https://example.com/profile.php?id=615739',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://static.example.net/favicon.ico',
        thumbnail: 'https://cdn.example.net/thumb.jpg?ccb=1-7',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the url and title are present', async () => {
      const value = html`
        <div class="bbCodeBlock bbCodeBlock--unfurl" data-url="https://example.com/page">
          <h3 class="js-unfurl-title">Page title</h3>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'xenforo',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should extract a card without a thumbnail figure', async () => {
      const value = html`
        <div
          class="bbCodeBlock bbCodeBlock--unfurl"
          data-url="https://example.com/page"
          data-host="example.com"
        >
          <h3 class="js-unfurl-title">Page title</h3>
          <div class="js-unfurl-desc">Preview text</div>
          <span class="js-unfurl-favicon">
            <img src="https://example.com/favicon.ico" alt="" />
          </span>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'xenforo',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://example.com/favicon.ico',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the wrapper url over the inner anchor href', async () => {
      const value = html`
        <div class="bbCodeBlock bbCodeBlock--unfurl" data-url="https://example.com/canonical">
          <h3 class="js-unfurl-title">
            <a href="https://example.com/tracked">Page title</a>
          </h3>
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the url attribute is missing', async () => {
      const value = html`
        <div class="bbCodeBlock bbCodeBlock--unfurl">
          <h3 class="js-unfurl-title">Page title</h3>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div class="bbCodeBlock bbCodeBlock--unfurl" data-url="https://example.com/page">
          <div class="js-unfurl-desc">Preview text</div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
