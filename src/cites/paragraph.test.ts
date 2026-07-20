import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { paragraphCiteResolver } from './paragraph.js'

describeForEachParser('paragraphCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, paragraphCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete payload', async () => {
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data='{"provider_url":"https://example.com","description":"Preview text","title":"Page title","url":"https://example.com/post","thumbnail_url":"https://example.com/cover.png","author_name":"Author name","version":"1.0","provider_name":"Example","type":"link"}'
          format="small"
        >
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'paragraph',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        author: 'Author name',
        publisher: 'Example',
        thumbnail: 'https://example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only url and title are present', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post","title":"Page title"}'></div>
      `
      const expected: CiteResolverResult = {
        provider: 'paragraph',
        url: 'https://example.com/post',
        title: 'Page title',
        description: undefined,
        author: undefined,
        publisher: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should discard the rendered card the div wraps', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post","title":"Page title"}'>
          <div class="react-component embed my-5">
            <a class="link-embed-link" href="https://example.com/post">
              <div class="link-embed"><h2>Rendered title</h2><p>Rendered text</p></div>
            </a>
          </div>
        </div>
      `

      expect((await extract(value))?.title).toBe('Page title')
    })
  })

  describe('edge cases', () => {
    it('should fall back to the src attribute when the payload has no url', async () => {
      const value = html`
        <div data-type="embedly" src="http://example.com/typed" data='{"title":"Page title"}'></div>
      `

      expect((await extract(value))?.url).toBe('http://example.com/typed')
    })

    it('should prefer the payload url over the src attribute', async () => {
      const value = html`
        <div
          data-type="embedly"
          src="http://example.com/typed"
          data='{"url":"https://example.com/canonical","title":"Page title"}'
        >
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/canonical')
    })

    it('should extract a payload with no type', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post","title":"Page title"}'></div>
      `

      expect((await extract(value))?.title).toBe('Page title')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post","title":" Padded title "}'></div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a video embed', async () => {
      const value = html`
        <div
          data-type="embedly"
          data='{"url":"https://example.com/watch","title":"Video title","type":"video"}'
        >
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the data attribute is missing', async () => {
      const value = html`
        <div data-type="embedly" src="https://example.com/post"></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the data attribute is not valid JSON', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post",'></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post"}'></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no url anywhere', async () => {
      const value = html`
        <div data-type="embedly" data='{"title":"Page title"}'></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <div data-type="embedly" data='{"url":"https://example.com/post","title":" "}'></div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
