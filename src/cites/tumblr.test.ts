import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { tumblrCiteResolver } from './tumblr.js'

describeForEachParser('tumblrCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, tumblrCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete payload', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://example.com/post","display_url":"https://example.com/post","title":"Page title","description":"Preview text","site_name":"example.com","poster":[{"url":"https://example.com/cover.jpg","type":"image/jpeg","width":800,"height":316}]}'
        >
          <a href="https://example.com/post" target="_blank">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://example.com/cover.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only url and title are present', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":"https://example.com/post","title":"Page title"}'>
          <a href="https://example.com/post">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
        description: undefined,
        publisher: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should unwrap an href.li redirect', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://href.li/?https://example.com/post","title":"Page title"}'
        >
          <a href="https://href.li/?https://example.com/post">Page title</a>
        </p>
      `

      expect((await extract(value))?.url).toBe('https://example.com/post')
    })

    it('should unwrap and decode a t.umblr.com redirect', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fprojects%2Fpost&t=abc","title":"Page title"}'
        >
          <a href="https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fprojects%2Fpost&t=abc">Page title</a>
        </p>
      `

      expect((await extract(value))?.url).toBe('https://example.com/projects/post')
    })

    it('should keep the redirect url when it carries no target param', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://t.umblr.com/redirect?t=abc","title":"Page title"}'
        >
          <a href="https://t.umblr.com/redirect?t=abc">Page title</a>
        </p>
      `

      expect((await extract(value))?.url).toBe('https://t.umblr.com/redirect?t=abc')
    })

    it('should leave the thumbnail undefined when the poster has no url', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://example.com/post","title":"Page title","poster":[{"media_key":"0b043233:b33b79b8","type":"image/png","width":800,"height":316}]}'
        >
          <a href="https://example.com/post">Page title</a>
        </p>
      `

      expect((await extract(value))?.thumbnail).toBeUndefined()
    })

    it('should fall back to the anchor href when the payload has no url', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","title":"Page title"}'>
          <a href="https://example.com/post">Page title</a>
        </p>
      `

      expect((await extract(value))?.url).toBe('https://example.com/post')
    })

    it('should fall back to the anchor text when the payload has no title', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":"https://example.com/post"}'>
          <a href="https://example.com/post">Anchor title</a>
        </p>
      `

      expect((await extract(value))?.title).toBe('Anchor title')
    })

    it('should extract a payload with no type', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"url":"https://example.com/post","title":"Page title"}'>
          <a href="https://example.com/post">Page title</a>
        </p>
      `

      expect((await extract(value))?.title).toBe('Page title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the anchor text is just the url', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":"https://example.com/post"}'>
          <a href="https://example.com/post">https://example.com/post</a>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a poll block', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"poll","question":"Which one?","url":"https://example.com/post"}'>
          <a href="https://example.com/post">Which one?</a>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the data attribute is missing', async () => {
      const value = html`
        <p class="npf_link"><a href="https://example.com/post">Page title</a></p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the data attribute is not valid JSON', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":'><a href="https://example.com/post">Page title</a></p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when there is no url anywhere', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","title":"Page title"}'>Page title</p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
