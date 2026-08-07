import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { discourseCiteResolver } from './discourse.js'

describeForEachParser('discourseCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, discourseCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://example.com/page#comment-1">
          <header class="source">
            <img
              src="https://forum.example.org/uploads/default/original/2X/1/icon.png"
              class="site-icon"
              alt=""
              data-dominant-color="B4C5E1"
              width="32"
              height="32"
            />
            <a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">example.com</a>
          </header>
          <article class="onebox-body">
            <div class="aspect-image" style="--aspect-ratio:690/362;">
              <img
                src="https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg"
                class="thumbnail"
                data-dominant-color="DEDEDE"
                width="690"
                height="362"
              />
            </div>
            <h3><a href="https://example.com/page#comment-1" target="_blank" rel="noopener nofollow ugc">Page title</a></h3>
            <p>Preview text</p>
          </article>
          <div class="onebox-metadata"></div>
          <div style="clear: both"></div>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page#comment-1',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://forum.example.org/uploads/default/original/2X/1/icon.png',
        thumbnail: 'https://forum.example.org/uploads/default/optimized/2X/d/thumb.jpeg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the source and title are present', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `
      const expected: CiteResolverResult = {
        provider: 'discourse',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the date from the source title and trim it off the publisher', async () => {
      const value = html`
        <aside class="onebox allowlistedgeneric" data-onebox-src="https://example.com/page">
          <header class="source">
            <img src="https://example.com/favicon.svg" class="site-icon" width="500" height="500">
            <a href="https://example.com/page" target="_blank" rel="noopener" title="03:33PM - 13 January 2023">Example – 13 Jan 23</a>
          </header>
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `
      const result = await extract(value)

      expect(result?.publisher).toBe('Example')
      expect(result?.date).toBe('03:33PM - 13 January 2023')
    })

    it('should keep a dash-carrying publisher whole when there is no timestamp', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <header class="source">
            <a href="https://example.com/page">Foo – Bar Forum</a>
          </header>
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `
      const result = await extract(value)

      expect(result?.publisher).toBe('Foo – Bar Forum')
      expect(result?.date).toBeUndefined()
    })

    it('should read the title from a level-four heading', async () => {
      const value = html`
        <aside class="onebox githubissue" data-onebox-src="https://example.com/owner/repo/issues/1">
          <article class="onebox-body">
            <h4>Issue title</h4>
            <p>Issue body</p>
          </article>
        </aside>
      `

      expect((await extract(value))?.title).toBe('Issue title')
    })

    it('should prefer the wrapper source over the inner anchor href', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/canonical">
          <article class="onebox-body">
            <h3><a href="https://example.com/tracked">Page title</a></h3>
          </article>
        </aside>
      `

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the source attribute is missing', async () => {
      const value = html`
        <aside class="onebox">
          <article class="onebox-body">
            <h3>Page title</h3>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <aside class="onebox" data-onebox-src="https://example.com/page">
          <article class="onebox-body">
            <p>Preview text</p>
          </article>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
