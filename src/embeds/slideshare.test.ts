import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
  slideshareResolveEmbed,
} from './slideshare.js'

describe('slideshareResolveEmbed', () => {
  it('should keep the keyed embed the current dialog writes', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAY'
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6PCWPGFw9SwsAY',
      src: value,
    }

    expect(slideshareResolveEmbed(value)).toEqual(expected)
  })

  it('should keep the numeric embed the keyed one replaced', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/6435157'
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6435157',
      src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
    }

    expect(slideshareResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a slideshare url that names no deck', () => {
    const value = 'https://www.slideshare.net/haraldf'

    expect(slideshareResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore an embed path that stops before the deck', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/'

    expect(slideshareResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a keyed path that stops before the key', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/key/'

    expect(slideshareResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a key outside the url-safe alphabet', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/key/../evil'

    expect(slideshareResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore another host carrying the embed path', () => {
    const value = 'https://slideshare.net.evil.test/slideshow/embed_code/6435157'

    expect(slideshareResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('slideshareFlashEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(slideshareFlashEmbedResolver.selector)

    return element
      ? (slideshareFlashEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('the wrapper the flash snippet builds', () => {
    it('should replace the dead player with the embed the id still serves', () => {
      const value = html`
        <div style="width:425px" id="__ss_6435157">
          <strong style="display:block;margin:12px 0 4px">
            <a
              href="http://www.slideshare.net/haraldf/business-quotes-for-2011"
              title="Business Quotes for 2011"
              >Business Quotes for 2011</a
            >
          </strong>
          <object id="__sse6435157" width="425" height="355">
            <param
              name="movie"
              value="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes2010-12-110103073149-phpapp01&amp;stripped_title=business-quotes-for-2011&amp;userName=haraldf"
            />
            <embed
              name="__sse6435157"
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes2010-12-110103073149-phpapp01&amp;stripped_title=business-quotes-for-2011&amp;userName=haraldf"
              type="application/x-shockwave-flash"
              width="425"
              height="355"
            ></embed>
          </object>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
        url: 'http://www.slideshare.net/haraldf/business-quotes-for-2011',
        title: 'Business Quotes for 2011',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should compose the deck page from the swf query when the wrapper links nowhere', () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes&amp;stripped_title=business-quotes-for-2011&amp;userName=haraldf"
              type="application/x-shockwave-flash"
            ></embed>
          </object>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
        url: 'https://www.slideshare.net/haraldf/business-quotes-for-2011',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should read the id off the object when the outer div is gone', () => {
      const value = html`
        <object id="__sse6435157">
          <embed
            src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
            type="application/x-shockwave-flash"
          ></embed>
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no wrapper names the deck', () => {
      const value = html`
        <embed
          src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
          type="application/x-shockwave-flash"
        ></embed>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for another host serving the same player path', () => {
      const value = html`
        <div id="__ss_6435157">
          <embed
            src="http://slidesharecdn.com.evil.test/swf/ssplayer2.swf?doc=110103quotes"
            type="application/x-shockwave-flash"
          ></embed>
        </div>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a slideshare player that is not the flash one', () => {
      const value = html`
        <div id="__ss_6435157">
          <embed src="https://static.slidesharecdn.com/other/thing.swf"></embed>
        </div>
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('slideshareIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(slideshareIframeEmbedResolver.selector)

    return element
      ? (slideshareIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  it('should resolve the keyed iframe the current dialog writes', () => {
    const value = html`
      <iframe
        src="https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAY"
        width="427"
        height="356"
        frameborder="0"
        allowfullscreen
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6PCWPGFw9SwsAY',
      src: 'https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAY',
    }

    expect(extract(value)).toEqual(expected)
  })

  it('should ignore an iframe on another host', () => {
    const value = html`
      <iframe src="https://evil.test/slideshow/embed_code/key/6PCWPGFw9SwsAY"></iframe>
    `

    expect(extract(value)).toBeUndefined()
  })
})
