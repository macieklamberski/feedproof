import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { mailruEmbedResolver, mailruResolveEmbed } from './mailru.js'

describe('mailruResolveEmbed', () => {
  describe('happy paths', () => {
    it('should take the numeric id the share dialog writes', () => {
      const value = 'https://my.mail.ru/video/embed/253943806846567285'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: '253943806846567285',
        src: 'https://my.mail.ru/video/embed/253943806846567285',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the sign of a negative id', () => {
      const value = 'https://my.mail.ru/video/embed/-16687799075863114'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: '-16687799075863114',
        src: 'https://my.mail.ru/video/embed/-16687799075863114',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })

    it('should move the dead api host onto the player that serves the same path', () => {
      const value = 'http://api.video.mail.ru/videos/embed/corp/lady/86/753.html'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'corp/lady/86/753',
        src: 'https://my.mail.ru/corp/lady/video/embed/86/753',
        url: 'https://my.mail.ru/corp/lady/video/86/753.html',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })

    it('should mint the end of the redirect the videoapi host sends', () => {
      const value = 'https://videoapi.my.mail.ru/videos/embed/mail/eduspb.com/_myvideo/248.html'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'mail/eduspb.com/_myvideo/248',
        src: 'https://my.mail.ru/mail/eduspb.com/video/embed/_myvideo/248',
        url: 'https://my.mail.ru/mail/eduspb.com/video/_myvideo/248.html',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })

    it('should read the path form the player already serves', () => {
      const value = 'https://my.mail.ru/mail/shels_1991/video/embed/20/885'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'mail/shels_1991/20/885',
        src: 'https://my.mail.ru/mail/shels_1991/video/embed/20/885',
        url: 'https://my.mail.ru/mail/shels_1991/video/20/885.html',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })

    it('should read the video the Flash player names on its query', () => {
      const value =
        'http://img.mail.ru/r/video2/uvpv3.swf?2&movieSrc=mail/anizm.com/4418/4427&autoplay=0'
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'mail/anizm.com/4418/4427',
        src: 'https://my.mail.ru/mail/anizm.com/video/embed/4418/4427',
        url: 'https://my.mail.ru/mail/anizm.com/video/4418/4427.html',
      }

      expect(mailruResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/my.mail.ru/video/embed/253943806846567285'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore the watch page, which frames nothing', () => {
      const value = 'https://my.mail.ru/mail/shels_1991/video/20/885.html'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a numeric route whose id is not a number', () => {
      const value = 'https://my.mail.ru/video/embed/latest'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a legacy path that does not name a video', () => {
      const value = 'https://videoapi.my.mail.ru/videos/embed/mail/eduspb.com/list.html'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a swf on the image host that is not the player', () => {
      const value = 'http://img.mail.ru/r/banners/promo.swf?movieSrc=mail/anizm.com/4418/4427'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore the Flash player when nothing names a video', () => {
      const value = 'http://img.mail.ru/r/video2/uvpv3.swf?3'

      expect(mailruResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('mailruEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mailruEmbedResolver)

  describe('happy paths', () => {
    it('should keep the box the share dialog states', async () => {
      const value = html`
        <iframe
          src="https://my.mail.ru/video/embed/253943806846567285"
          width="626"
          height="367"
          frameborder="0"
          scrolling="no"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: '253943806846567285',
        src: 'https://my.mail.ru/video/embed/253943806846567285',
        width: 626,
        height: 367,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should repair the iframe on the dead api host', async () => {
      const value = html`
        <iframe
          src="http://api.video.mail.ru/videos/embed/corp/lady/86/753.html"
          width="540"
          height="328"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'corp/lady/86/753',
        src: 'https://my.mail.ru/corp/lady/video/embed/86/753',
        url: 'https://my.mail.ru/corp/lady/video/86/753.html',
        width: 540,
        height: 328,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/my.mail.ru/video/embed/253943806846567285"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the Flash player when its flashvars name no video', async () => {
      const value = html`
        <object
          type="application/x-shockwave-flash"
          data="http://img.mail.ru/r/video2/uvpv3.swf?3"
        >
          <param name="flashvars" value="autoplay=0" />
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the Flash player that named the video in its flashvars', () => {
    it('should repair the object whose flashvars param names the video', async () => {
      const value = html`
        <object
          type="application/x-shockwave-flash"
          data="http://img.mail.ru/r/video2/uvpv3.swf?3"
          width="626"
          height="367"
        >
          <param name="flashvars" value="movieSrc=mail/alinavrik59/142/143&autoplay=0" />
          <param name="allowFullScreen" value="true" />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'mail/alinavrik59/142/143',
        src: 'https://my.mail.ru/mail/alinavrik59/video/embed/142/143',
        url: 'https://my.mail.ru/mail/alinavrik59/video/142/143.html',
        width: 626,
        height: 367,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should repair the embed whose query names the video', async () => {
      const value = html`
        <embed
          src="http://img.mail.ru/r/video2/uvpv3.swf?2&movieSrc=mail/anizm.com/4418/4427&autoplay=0"
          width="100%"
          height="390"
          allowFullScreen="true"
        >
      `
      const expected: EmbedResolverResult = {
        provider: 'mailru',
        id: 'mail/anizm.com/4418/4427',
        src: 'https://my.mail.ru/mail/anizm.com/video/embed/4418/4427',
        url: 'https://my.mail.ru/mail/anizm.com/video/4418/4427.html',
        height: 390,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
