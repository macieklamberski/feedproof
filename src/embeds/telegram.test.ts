import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  readTelegramHeight,
  telegramIframeEmbedResolver,
  telegramScriptEmbedResolver,
} from './telegram.js'

describeForEachParser('telegramScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, telegramScriptEmbedResolver)

  describe('the widget script', () => {
    // The shape 194 corpus feeds lose outright, copied from tochka.press (2026-08-14).
    it('should mint the post url from the channel and message id', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?23"
          data-telegram-post="tochkapress/111424"
          data-width="100%"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'tochkapress/111424',
        src: 'https://t.me/tochkapress/111424?embed=1',
        url: 'https://t.me/tochkapress/111424',
        author: 'tochkapress',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a script that carries no src', async () => {
      const value = '<script data-telegram-post="rybar/54321"></script>'
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'rybar/54321',
        src: 'https://t.me/rybar/54321?embed=1',
        url: 'https://t.me/rybar/54321',
        author: 'rybar',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Telegram's signup form asks for five characters, but shorter channels exist and serve
    // posts: `t.me/nft/3?embed=1` and `t.me/tech/3853?embed=1` both render one, while
    // `t.me/tech/99999999?embed=1` renders the not-found bubble (checked 2026-09-07).
    it('should accept a three-character channel', async () => {
      const value = '<script data-telegram-post="nft/3"></script>'
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'nft/3',
        src: 'https://t.me/nft/3?embed=1',
        url: 'https://t.me/nft/3',
        author: 'nft',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should accept a channel holding digits and underscores', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-post="letletlet_warplanes2/9"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'letletlet_warplanes2/9',
        src: 'https://t.me/letletlet_warplanes2/9?embed=1',
        url: 'https://t.me/letletlet_warplanes2/9',
        author: 'letletlet_warplanes2',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the width the snippet states', () => {
    it('should read a pixel width', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-post="tochkapress/111424"
          data-width="480"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'tochkapress/111424',
        src: 'https://t.me/tochkapress/111424?embed=1',
        url: 'https://t.me/tochkapress/111424',
        author: 'tochkapress',
        width: 480,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a width spelled in px', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-post="tochkapress/111424"
          data-width="480px"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'tochkapress/111424',
        src: 'https://t.me/tochkapress/111424?embed=1',
        url: 'https://t.me/tochkapress/111424',
        author: 'tochkapress',
        width: 480,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The post resolves without a size either way, so the whole result is stated: a percentage
    // is not a pixel width, and the widget states no height at all.
    it('should drop a percentage width', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-post="tochkapress/111424"
          data-width="100%"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'tochkapress/111424',
        src: 'https://t.me/tochkapress/111424?embed=1',
        url: 'https://t.me/tochkapress/111424',
        author: 'tochkapress',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore the widget colour attributes', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-post="tochkapress/111424"
          data-userpic="true"
          data-dark="1"
          data-color="343638"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'tochkapress/111424',
        src: 'https://t.me/tochkapress/111424?embed=1',
        url: 'https://t.me/tochkapress/111424',
        author: 'tochkapress',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a channel with no message id', async () => {
      const value = '<script data-telegram-post="tochkapress"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-numeric message id', async () => {
      const value = '<script data-telegram-post="tochkapress/latest"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a two-character channel', async () => {
      const value = '<script data-telegram-post="ab/111424"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a traversal in the attribute', async () => {
      const value = '<script data-telegram-post="../evil/111424"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty attribute', async () => {
      const value = '<script data-telegram-post=""></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('deliberate non-resolutions', () => {
    // The login button and the comments widget are the other two snippets telegram-widget.js
    // serves. Neither is a post, and neither names one.
    it('should not match the login widget', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-login="somebot"
          data-size="large"
        ></script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match the comments widget', async () => {
      const value = html`
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-discussion="tochkapress/111424"
        ></script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // A forum channel writes `channel/topic/message`. No corpus specimen carries one and the
    // census stores only the first path segment, so the url was never checked. Resolving the
    // topic id as the message id would point the placeholder at the wrong post.
    it('should leave a forum topic post unresolved', async () => {
      const value = '<script data-telegram-post="tochkapress/45/111424"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('telegramIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, telegramIframeEmbedResolver)

  describe('the rendered widget iframe', () => {
    // What the widget script builds, saved into the feed by a CMS that ran it: 34 corpus feeds
    // carry a t.me iframe. `width="100%"` is not a pixel size, so only the height survives.
    it('should claim the iframe the widget builds', async () => {
      const value = html`
        <iframe
          id="telegram-post-rvvoenkor-12345"
          src="https://t.me/rvvoenkor/12345?embed=1"
          width="100%"
          height="500"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'rvvoenkor/12345',
        src: 'https://t.me/rvvoenkor/12345?embed=1',
        url: 'https://t.me/rvvoenkor/12345',
        author: 'rvvoenkor',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A bare post link in an iframe renders the "open in Telegram" page rather than the post,
    // so minting `?embed=1` repairs it.
    it('should add the embed parameter to a bare post url', async () => {
      const value = '<iframe src="https://t.me/rvvoenkor/12345"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'rvvoenkor/12345',
        src: 'https://t.me/rvvoenkor/12345?embed=1',
        url: 'https://t.me/rvvoenkor/12345',
        author: 'rvvoenkor',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // telegram.me serves the same page and never redirects, so the canonical host is minted.
    it('should mint the t.me url from the legacy telegram.me host', async () => {
      const value = '<iframe src="https://telegram.me/rvvoenkor/12345?embed=1"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'rvvoenkor/12345',
        src: 'https://t.me/rvvoenkor/12345?embed=1',
        url: 'https://t.me/rvvoenkor/12345',
        author: 'rvvoenkor',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The third apex Telegram answers on, serving the identical widget.
    it('should mint the t.me url from the telegram.dog host', async () => {
      const value = '<iframe src="https://telegram.dog/rvvoenkor/12345?embed=1"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'telegram',
        id: 'rvvoenkor/12345',
        src: 'https://t.me/rvvoenkor/12345?embed=1',
        url: 'https://t.me/rvvoenkor/12345',
        author: 'rvvoenkor',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a channel page with no message', async () => {
      const value = '<iframe src="https://t.me/rvvoenkor"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the channel preview path', async () => {
      const value = '<iframe src="https://t.me/s/rvvoenkor"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a share link', async () => {
      const value = '<iframe src="https://t.me/share/url?url=https://example.com"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an invite link', async () => {
      const value = '<iframe src="https://t.me/joinchat/AAAAAEjuMbcYbBLTLA"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // A private channel addresses itself by internal id, `t.me/c/1234567/89`, which the embed
    // route does not serve.
    it('should return undefined for a private channel message', async () => {
      const value = '<iframe src="https://t.me/c/1234567/89"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // The same route without the message is the shape the two-segment pattern could claim, and
    // the only thing refusing it is that `c` sits under the channel floor.
    it('should return undefined for a private channel id', async () => {
      const value = '<iframe src="https://t.me/c/1234567"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim another host spelling t.me in its path', async () => {
      const value = '<iframe src="https://evil.test/t.me/rvvoenkor/12345?embed=1"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('readTelegramHeight', () => {
  it('should read the height out of a resize', () => {
    expect(readTelegramHeight({ event: 'resize', height: 179 })).toBe(179)
  })

  it('should read nothing out of a post that could not load', () => {
    expect(readTelegramHeight({ event: 'resize', height: null })).toBeUndefined()
    expect(readTelegramHeight({ event: 'ready' })).toBeUndefined()
  })
})
