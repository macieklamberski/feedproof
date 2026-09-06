import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  cnnFlashEmbedResolver,
  cnnFlashResolveEmbed,
  cnnIframeEmbedResolver,
  cnnResolveEmbed,
  cnnScriptEmbedResolver,
} from './cnn.js'

describe('cnnResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the current player url', () => {
      const value =
        '//fave.api.cnn.io/v1/fav/?video=arts/2018/07/09/spencer-tunick-nude-art-melbourne.cnn&customer=cnn&edition=international&env=prod'
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'arts/2018/07/09/spencer-tunick-nude-art-melbourne.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=arts/2018/07/09/spencer-tunick-nude-art-melbourne.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/arts/2018/07/09/spencer-tunick-nude-art-melbourne.cnn',
        ratio: '16/9',
      }

      expect(cnnResolveEmbed(value)).toEqual(expected)
    })

    it('should move the 2014 player onto the current one', () => {
      const value =
        'http://www.cnn.com/video/api/embed.html#/video/living/2014/01/11/ac-intv-fallon-neuroscientist-finds-psychopathy.cnn'
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'living/2014/01/11/ac-intv-fallon-neuroscientist-finds-psychopathy.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=living/2014/01/11/ac-intv-fallon-neuroscientist-finds-psychopathy.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/living/2014/01/11/ac-intv-fallon-neuroscientist-finds-psychopathy.cnn',
        ratio: '16/9',
      }

      expect(cnnResolveEmbed(value)).toEqual(expected)
    })

    it('should move the 2008 player onto the current one', () => {
      const value =
        'http://edition.cnn.com/video/savp/evp/?loc=int&vid=/video/business/2008/04/22/tucker.nau.nola.cnn'
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'business/2008/04/22/tucker.nau.nola.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=business/2008/04/22/tucker.nau.nola.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/business/2008/04/22/tucker.nau.nola.cnn',
        ratio: '16/9',
      }

      expect(cnnResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the video page itself', () => {
      const value =
        'https://www.cnn.com/videos/us/2013/11/22/nr-rowlands-charles-manson-fiance-speaks.cnn'

      expect(cnnResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a player naming no video', () => {
      const value = 'https://fave.api.cnn.io/v1/fav/?customer=cnn&edition=domestic&env=prod'

      expect(cnnResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not a video path', () => {
      const value = 'https://fave.api.cnn.io/v1/fav/?video=19701&customer=cnn'

      expect(cnnResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        'https://fave.api.cnn.io.evil.test/v1/fav/?video=arts/2018/07/09/spencer-tunick-nude-art-melbourne.cnn'

      expect(cnnResolveEmbed(value)).toBeUndefined()
    })
  })
})

describe('cnnFlashResolveEmbed', () => {
  describe('happy paths', () => {
    it('should read the video out of the swf query', () => {
      const value =
        'http://i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/cnn_416x234_embed.swf?context=embed&videoId=politics/2011/02/27/rs.book.google.power.cnn'
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'politics/2011/02/27/rs.book.google.power.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=politics/2011/02/27/rs.book.google.power.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/politics/2011/02/27/rs.book.google.power.cnn',
        ratio: '16/9',
      }

      expect(cnnFlashResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for another Turner property on the same CDN', () => {
      const value =
        'http://i.cdn.turner.com/v5cache/TBS/cvp/teamcoco_drupal_embed.swf?context=teamcoco_embed_offsite&videoId=19701'

      expect(cnnFlashResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a swf naming no video', () => {
      const value = 'http://i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/cnn_416x234_embed.swf'

      expect(cnnFlashResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('cnnIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, cnnIframeEmbedResolver)

  // The pasted iframe states 416 by 234, and the resolver's ratio is preferred over it.
  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        frameborder="0"
        height="234"
        src="https://fave.api.cnn.io/v1/fav/?video=us/2018/06/24/finding-hope-suicide-special-report-full-show.cnn&amp;customer=cnn&amp;edition=domestic&amp;env=prod"
        width="416"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'cnn',
      id: 'us/2018/06/24/finding-hope-suicide-special-report-full-show.cnn',
      src: 'https://fave.api.cnn.io/v1/fav/?video=us/2018/06/24/finding-hope-suicide-special-report-full-show.cnn&customer=cnn&edition=domestic&env=prod',
      url: 'https://www.cnn.com/videos/us/2018/06/24/finding-hope-suicide-special-report-full-show.cnn',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same path', async () => {
    const value =
      '<iframe src="https://evil.test/fave.api.cnn.io/v1/fav/?video=us/2018/06/24/finding-hope.cnn"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

describeForEachParser('cnnFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, cnnFlashEmbedResolver)

  describe('happy paths', () => {
    it('should read the video out of the embed src', async () => {
      const value = html`
        <embed
          src="http://i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/cnn_416x234_embed.swf?context=embed&videoId=politics/2011/02/27/rs.book.google.power.cnn"
          type="application/x-shockwave-flash"
          width="416"
          height="374"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'politics/2011/02/27/rs.book.google.power.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=politics/2011/02/27/rs.book.google.power.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/politics/2011/02/27/rs.book.google.power.cnn',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the video out of the flashvars when the swf query has none', async () => {
      const value = html`
        <embed
          src="http://i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/cnn_416x234_embed.swf?context=embed"
          flashvars="videoId=us/2012/01/14/pkg-candiotti-gay-man-faces-deportation.cnn"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'us/2012/01/14/pkg-candiotti-gay-man-faces-deportation.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=us/2012/01/14/pkg-candiotti-gay-man-faces-deportation.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/us/2012/01/14/pkg-candiotti-gay-man-faces-deportation.cnn',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<embed src="https://evil.test/i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/cnn_416x234_embed.swf?videoId=politics/2011/02/27/rs.book.google.power.cnn" />'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('cnnScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, cnnScriptEmbedResolver)

  describe('happy paths', () => {
    it('should build the placeholder from the loader script', async () => {
      const value = html`
        <script
          src="http://i.cdn.turner.com/cnn/.element/js/2.0/video/evp/module.js?loc=dom&vid=/video/politics/2009/05/21/obama.guantanamo.cnn"
          type="text/javascript"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'cnn',
        id: 'politics/2009/05/21/obama.guantanamo.cnn',
        src: 'https://fave.api.cnn.io/v1/fav/?video=politics/2009/05/21/obama.guantanamo.cnn&customer=cnn&edition=domestic&env=prod',
        url: 'https://www.cnn.com/videos/politics/2009/05/21/obama.guantanamo.cnn',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a loader naming no video', async () => {
      const value =
        '<script src="http://i.cdn.turner.com/cnn/.element/js/2.0/video/evp/module.js?loc=dom"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<script src="https://evil.test/cdn.turner.com/cnn/.element/js/2.0/video/evp/module.js?vid=/video/politics/2009/05/21/obama.guantanamo.cnn"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
