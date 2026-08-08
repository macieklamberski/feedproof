import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { facebookPostEmbedResolver, facebookVideoEmbedResolver } from './facebook.js'

describeForEachParser('facebookPostEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(facebookPostEmbedResolver.selector)

    return element ? (facebookPostEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should mint the post plugin url from the data-href', () => {
      const value = html`
        <div
          class="fb-post"
          data-href="https://www.facebook.com/BlowflyOfficial/posts/10153426898243990:0"
          data-width="466"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/BlowflyOfficial/posts/10153426898243990:0',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FBlowflyOfficial%2Fposts%2F10153426898243990%3A0',
        url: 'https://www.facebook.com/BlowflyOfficial/posts/10153426898243990:0',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should keep the href query encoded in the plugin url', () => {
      const value =
        '<div class="fb-post" data-href="https://www.facebook.com/renodancecompany/photos/317243261734291/?type=1"></div>'

      expect(extract(value)).toMatchObject({
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Frenodancecompany%2Fphotos%2F317243261734291%2F%3Ftype%3D1',
      })
    })

    it('should replace the empty div with an embed placeholder', async () => {
      const value =
        '<div class="fb-post" data-href="https://www.facebook.com/BlowflyOfficial/posts/10153426898243990:0"></div>'
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toContain('data-embed-provider="facebook"')
      expect(result).not.toContain('fb-post')
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an empty data-href', () => {
      const value = '<div class="fb-post" data-href=""></div>'

      expect(extract(value)).toBeUndefined()
    })

    it('should not match a post div without the data-href attribute', () => {
      const value = '<div class="fb-post" data-width="466"></div>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-facebook href', () => {
      const value = '<div class="fb-post" data-href="https://evil.test/facebook.com/post"></div>'

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookVideoEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(facebookVideoEmbedResolver.selector)

    return element
      ? (facebookVideoEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should mint the video plugin url from the data-href', () => {
      const value = html`
        <div
          class="fb-video"
          data-href="https://www.facebook.com/WillowbankRaceway/videos/732638203506014/"
          data-width="500"
          data-show-text="true"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/WillowbankRaceway/videos/732638203506014/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FWillowbankRaceway%2Fvideos%2F732638203506014%2F',
        url: 'https://www.facebook.com/WillowbankRaceway/videos/732638203506014/',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an empty data-href', () => {
      const value = '<div class="fb-video" data-href=""></div>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        '<div class="fb-video" data-href="https://facebook.com.evil.test/videos/732638203506014/"></div>'

      expect(extract(value)).toBeUndefined()
    })
  })
})
