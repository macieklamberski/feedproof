import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
  slideshareResolveEmbed,
} from './slideshare.js'

describe('slideshareResolveEmbed', () => {
  it('should keep the numeric embed the keyed one replaced', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/6435157'
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6435157',
      src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
    }

    expect(slideshareResolveEmbed(value)).toEqual(expected)
  })

  // Both spaces have grown since 2011, and neither length is what selects a deck.
  it('should keep a key longer than the ones minted so far', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAYlongerkey'
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6PCWPGFw9SwsAYlongerkey',
      src: 'https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAYlongerkey',
    }

    expect(slideshareResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a numeric deck id longer than the ones minted so far', () => {
    const value = 'https://www.slideshare.net/slideshow/embed_code/6435157123456'
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6435157123456',
      src: 'https://www.slideshare.net/slideshow/embed_code/6435157123456',
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
  const extract = resolverExtractor(parseHtml, slideshareFlashEmbedResolver)

  describe('the wrapper the flash snippet builds', () => {
    it('should replace the dead player with the embed the id still serves', async () => {
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
        width: 425,
        height: 355,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a wrapper id longer than the ones the snippet era minted', async () => {
      const value = html`
        <div id="__ss_6435157123456">
          <embed
            src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=quotes-phpapp01"
            type="application/x-shockwave-flash"
            width="425"
            height="355"
          ></embed>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157123456',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157123456',
        width: 425,
        height: 355,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should compose the deck page from the swf query when the wrapper links nowhere', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })

    // `searchParams` hands the owner and slug back decoded, so a separator written encoded
    // reaches the composed page url as a path of the feed's choosing.
    it('should drop a composed page whose owner smuggles a separator', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes&amp;stripped_title=business-quotes-for-2011&amp;userName=..%2F..%2Fadmin"
              type="application/x-shockwave-flash"
            ></embed>
          </object>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should drop a composed page whose owner and slug are dot segments', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes&amp;stripped_title=..&amp;userName=.."
              type="application/x-shockwave-flash"
            ></embed>
          </object>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The div spells the id with an underscore and the object without one. Every other fixture
    // here carries both, so only this shape exercises the div's spelling.
    it('should read the id off the div when the object carries none', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object>
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
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
        width: 425,
        height: 355,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should replace the document player the same way as the presentation one', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/doc_player.swf?doc=110103quotes&amp;stripped_title=business-quotes-for-2011&amp;userName=haraldf"
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

      expect(await extract(value)).toEqual(expected)
    })

    // The 2011 snippet trails the wrapper with "View more presentations from {owner}", so the
    // owner's page and the bare `slideshare.net/` link sit beside the deck's own anchor.
    it('should read the owner out of the caption the snippet trails', async () => {
      const value = html`
        <div id="__ss_6435157">
          <strong>
            <a
              href="http://www.slideshare.net/haraldf/business-quotes-for-2011"
              title="Business Quotes for 2011"
              >Business Quotes for 2011</a
            >
          </strong>
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
              type="application/x-shockwave-flash"
            ></embed>
          </object>
          <div>
            View more <a href="http://www.slideshare.net/">presentations</a> from
            <a href="http://www.slideshare.net/haraldf">Harald Felgner</a>.
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
        url: 'http://www.slideshare.net/haraldf/business-quotes-for-2011',
        title: 'Business Quotes for 2011',
        author: 'Harald Felgner',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The bare link names no deck, so the word it wraps is not this deck's name.
    it('should not read the caption home link as the deck when the deck anchor is gone', async () => {
      const value = html`
        <div id="__ss_6435157">
          <object id="__sse6435157">
            <embed
              src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
              type="application/x-shockwave-flash"
            ></embed>
          </object>
          <div>
            View more <a href="http://www.slideshare.net/">presentations</a> from
            <a href="http://www.slideshare.net/haraldf">Harald Felgner</a>.
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
        author: 'Harald Felgner',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A wrapper carrying no caption of its own leaves the climb one level short of the post,
    // where the first slideshare link is whichever deck was mentioned earlier.
    it('should ignore a deck link that sits outside the wrapper', async () => {
      const value = html`
        <div>
          <p>
            <a
              href="https://www.slideshare.net/someoneelse/a-different-deck"
              title="A Different Deck"
              >A Different Deck</a
            >
          </p>
          <div id="__ss_6435157">
            <object id="__sse6435157">
              <embed
                src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
                type="application/x-shockwave-flash"
              ></embed>
            </object>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6435157',
        src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the id off the object when the outer div is gone', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no wrapper names the deck', async () => {
      const value = html`
        <embed
          src="http://static.slidesharecdn.com/swf/ssplayer2.swf?doc=110103quotes"
          type="application/x-shockwave-flash"
        ></embed>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host serving the same player path', async () => {
      const value = html`
        <div id="__ss_6435157">
          <embed
            src="http://slidesharecdn.com.evil.test/swf/ssplayer2.swf?doc=110103quotes"
            type="application/x-shockwave-flash"
          ></embed>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a slideshare player that is not the flash one', async () => {
      const value = html`
        <div id="__ss_6435157">
          <embed src="https://static.slidesharecdn.com/other/thing.swf"></embed>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('slideshareIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, slideshareIframeEmbedResolver)

  it('should resolve the keyed iframe the current dialog writes', async () => {
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
      width: 427,
      height: 356,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should keep the numeric embed the keyed one replaced', async () => {
    const value = html`
      <iframe src="https://www.slideshare.net/slideshow/embed_code/6435157"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'slideshare',
      id: '6435157',
      src: 'https://www.slideshare.net/slideshow/embed_code/6435157',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a slideshare url that names no deck', async () => {
    const value = '<iframe src="https://www.slideshare.net/haraldf"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  it('should ignore an embed path that stops before the deck', async () => {
    const value = '<iframe src="https://www.slideshare.net/slideshow/embed_code/"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  it('should ignore a keyed path that stops before the key', async () => {
    const value = html`
      <iframe src="https://www.slideshare.net/slideshow/embed_code/key/"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })

  it('should ignore a key outside the url-safe alphabet', async () => {
    const value = html`
      <iframe src="https://www.slideshare.net/slideshow/embed_code/key/../evil"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })

  // A lookalike host carries the embed path but is not the platform.
  it('should ignore another host carrying the embed path', async () => {
    const value = html`
      <iframe src="https://slideshare.net.evil.test/slideshow/embed_code/6435157"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })

  it('should ignore an iframe on another host', async () => {
    const value = html`
      <iframe src="https://evil.test/slideshow/embed_code/key/6PCWPGFw9SwsAY"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })

  // The embed url names the deck by key or id alone, so everything a reader could read comes
  // from the caption the share dialog ships with the iframe.
  describe('the caption the share dialog ships beside the iframe', () => {
    it('should take the deck page, its name and its owner from the caption', async () => {
      const value = html`
        <div>
          <iframe
            src="https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAY"
            width="427"
            height="356"
          ></iframe>
          <div>
            <strong>
              <a
                href="https://www.slideshare.net/haraldf/business-quotes-for-2011"
                title="Business Quotes for 2011"
                >Business Quotes for 2011</a
              >
            </strong>
            from <strong><a href="https://www.slideshare.net/haraldf">Harald Felgner</a></strong>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '6PCWPGFw9SwsAY',
        src: 'https://www.slideshare.net/slideshow/embed_code/key/6PCWPGFw9SwsAY',
        url: 'https://www.slideshare.net/haraldf/business-quotes-for-2011',
        title: 'Business Quotes for 2011',
        author: 'Harald Felgner',
        width: 427,
        height: 356,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The generation between Flash and the current dialog kept the `__ss_{id}` wrapper and put
    // an iframe where the object had been, so the caption surrounds the player instead.
    it('should read the caption out of the wrapper the numeric snippet keeps', async () => {
      const value = html`
        <div id="__ss_10579166">
          <strong>
            <a
              href="http://www.slideshare.net/null0x00/make-profit-with-uiredressing-attacks"
              title="Make profit with UI-Redressing attacks."
              >Make profit with UI-Redressing attacks.</a
            >
          </strong>
          <iframe
            src="http://www.slideshare.net/slideshow/embed_code/10579166"
            width="425"
            height="355"
          ></iframe>
          <div>
            View more <a href="http://www.slideshare.net/">presentations</a> from
            <a href="http://www.slideshare.net/null0x00">n|u - The Open Security Community</a>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'slideshare',
        id: '10579166',
        src: 'https://www.slideshare.net/slideshow/embed_code/10579166',
        url: 'http://www.slideshare.net/null0x00/make-profit-with-uiredressing-attacks',
        title: 'Make profit with UI-Redressing attacks.',
        author: 'n|u - The Open Security Community',
        width: 425,
        height: 355,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The enclosure probe offers every attachment a feed carries to this resolver, and SlideShare's
// asset host is in its list, so the id shapes are what keep a file playable.
describeForEachParser('slideshare through the pipeline', (parseHtml) => {
  it('should leave an audio enclosure on the asset host playable', async () => {
    const enclosures = [
      { url: 'https://cdn.slidesharecdn.com/embed_code/6435157.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://cdn.slidesharecdn.com/embed_code/6435157.mp3"></audio>
      <p>Body</p>
    `

    expect(
      await transformContent('<p>Body</p>', {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
        enclosures,
      }),
    ).toEqualHtml(expected)
  })
})
