import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { tumblrCiteResolver } from './tumblr.js'

describeForEachParser('tumblrCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tumblrCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete payload', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://example.com/post","display_url":"https://example.com/post","title":"Page title","description":"Preview text","author":"Author name","site_name":"example.com","poster":[{"url":"https://example.com/cover.jpg","type":"image/jpeg","width":800,"height":316}]}'
        >
          <a href="https://example.com/post" target="_blank">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        author: 'Author name',
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
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract all fields from a rendered link block', async () => {
      const value = html`
        <div class="npf-link-block has-poster">
          <a target="_blank" href="https://example.com/post">
            <div class="poster" style="background-image:url(https://example.com/cover.png)">
              <div class="title">Page title</div>
            </div>
            <div class="bottom">
              <div class="description">Preview text</div>
              <div class="site-name">Example</div>
            </div>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'Example',
        thumbnail: 'https://example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave the thumbnail unset when a rendered link block has no poster', async () => {
      const value = html`
        <div class="npf-link-block">
          <a href="https://example.com/post">
            <div class="bottom"><div class="title">Page title</div></div>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a redirect url as it is, leaving unwrapping to the cleanUrlFn', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc","title":"Page title"}'
        >
          <a href="https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
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
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the anchor href when the payload has no url', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","title":"Page title"}'>
          <a href="https://example.com/post">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the anchor text when the payload has no title', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":"https://example.com/post"}'>
          <a href="https://example.com/post">Anchor title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Anchor title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should trim the description and the publisher', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://example.com/post","title":"Page title","description":"  Preview text\n","site_name":" example.com "}'
        >
          <a href="https://example.com/post">Page title</a>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'tumblr',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
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

    it('should return undefined when the anchor text is the url without a scheme', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"type":"link","url":"https://example.com/post"}'>
          <a href="https://example.com/post">example.com/post</a>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the anchor text is the display url truncated', async () => {
      const value = html`
        <p
          class="npf_link"
          data-npf='{"type":"link","url":"https://href.li/?https://example.com/a/very/long/post","display_url":"https://example.com/a/very/long/post"}'
        >
          <a href="https://href.li/?https://example.com/a/very/long/post">example.com/a/very…</a>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the payload has no type', async () => {
      const value = html`
        <p class="npf_link" data-npf='{"url":"https://example.com/post","title":"Page title"}'>
          <a href="https://example.com/post">Page title</a>
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

    it('should return undefined for a rendered link block with no title', async () => {
      const value = html`
        <div class="npf-link-block"><a href="https://example.com/post"></a></div>
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
