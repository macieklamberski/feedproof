import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  facebookIframeEmbedResolver,
  facebookPostEmbedResolver,
  facebookResolveEmbed,
  facebookVideoEmbedResolver,
} from './facebook.js'

// Every `data-embed-*` field the placeholder carries, so a variant can assert the whole set
// rather than the one field it happens to care about.
const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
  const element = parseHtml(result).querySelector('[data-embed-src]')
  const fields: Record<string, string> = {}

  for (const name of element?.getAttributeNames() ?? []) {
    const value = element?.getAttribute(name)

    if (name.startsWith('data-embed-') && value) {
      fields[name.replace('data-embed-', '')] = value
    }
  }

  return fields
}

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
      const value = html`
        <div
          class="fb-post"
          data-href="https://www.facebook.com/renodancecompany/photos/317243261734291/?type=1"
        ></div>
      `

      expect(extract(value)).toMatchObject({
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Frenodancecompany%2Fphotos%2F317243261734291%2F%3Ftype%3D1',
      })
    })

    it('should replace the empty div with an embed placeholder', async () => {
      const value = html`
        <div
          class="fb-post"
          data-href="https://www.facebook.com/BlowflyOfficial/posts/10153426898243990:0"
        ></div>
      `
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
      const value = html`
        <div
          class="fb-video"
          data-href="https://facebook.com.evil.test/videos/732638203506014/"
        ></div>
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(facebookIframeEmbedResolver.selector)

    return element
      ? (facebookIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('happy paths', () => {
    it('should name a post plugin iframe and keep the publisher src', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123&show_text=true&width=500"
        ></iframe>
      `

      expect(extract(value)).toMatchObject({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        url: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123&show_text=true&width=500',
      })
    })

    it('should name a video plugin iframe', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        ></iframe>
      `

      expect(extract(value)).toMatchObject({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
      })
    })
  })

  // The size a Facebook embed gets depends on which shape it arrived as, so each one is
  // asserted separately.
  describe('size sources', () => {
    describe('modern post iframe, size on the element only', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
          width="500"
          height="500"
        ></iframe>
      `

      it('should add no size of its own', () => {
        expect(extract(value)?.width).toBeUndefined()
        expect(extract(value)?.height).toBeUndefined()
      })

      it('should still reach the placeholder, read off the element', async () => {
        const result = await transformContent(value, {
          parseHtmlFn: parseHtml,
          baseUrl: 'https://example.com/post',
        })

        expect(result).toContain('data-embed-width="500"')
        expect(result).toContain('data-embed-height="500"')
      })
    })

    describe('landscape video iframe, size in the plugin query', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&show_text=false&width=560"
        ></iframe>
      `

      it('should take 560x314 from the query', () => {
        expect(extract(value)).toMatchObject({
          width: 560,
          height: 314,
        })
      })
    })

    describe('Reel iframe, vertical in the plugin query', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&width=267"
        ></iframe>
      `

      // A Reel is taller than it is wide, so a shared default would render it in a
      // landscape box.
      it('should keep the vertical 267x476 rather than a video default', () => {
        const result = extract(value)

        expect(result).toMatchObject({ width: 267, height: 476 })
        expect(Number(result?.width) < Number(result?.height)).toBe(true)
      })
    })

    describe('legacy iframe, no size anywhere in the url', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        ></iframe>
      `

      // A post's height follows its own content and Facebook publishes no signal for it, so
      // guessing one would be worse than leaving it to the consumer.
      it('should carry no size at all', () => {
        expect(extract(value)?.width).toBeUndefined()
        expect(extract(value)?.height).toBeUndefined()
      })
    })

    describe('video iframe carrying only one of the two', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&width=560"
        ></iframe>
      `

      it('should carry the width and leave the height unset', () => {
        expect(extract(value)).toMatchObject({ width: 560 })
        expect(extract(value)?.height).toBeUndefined()
      })
    })
  })

  describe('sad paths', () => {
    it('should ignore a facebook url that is not a plugin', () => {
      const value = '<iframe src="https://www.facebook.com/PageName/posts/123"></iframe>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a plugin href on a lookalike host', () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Ffacebook.com.evil.test%2Fposts%2F123"
        ></iframe>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a plugin url with no href', () => {
      const value = '<iframe src="https://www.facebook.com/plugins/post.php?width=500"></iframe>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a url that does not parse', () => {
      expect(facebookResolveEmbed('not a url')).toBeUndefined()
    })

    it('should return undefined for a legacy video frame with no video_id', () => {
      expect(
        facebookResolveEmbed('https://www.facebook.com/video/embed?autoplay=1'),
      ).toBeUndefined()
    })

    it('should return undefined for a legacy video frame with a non-numeric id', () => {
      expect(
        facebookResolveEmbed('https://www.facebook.com/video/embed?video_id=../etc'),
      ).toBeUndefined()
    })
  })
})

// One block per shape the corpus survey found, so a shape nobody handles is visible here as
// a missing block.
describeForEachParser('facebook variants', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  describe('SDK div, post', () => {
    const value =
      '<div class="fb-post" data-href="https://www.facebook.com/PageName/posts/123"></div>'

    it('should carry every field across', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      })
    })
  })

  describe('SDK div with the dialog fallback blockquote', () => {
    const value = html`
      <div class="fb-post" data-href="https://www.facebook.com/PageName/posts/123">
        <div class="fb-xfbml-parse-ignore">
          <blockquote cite="https://www.facebook.com/PageName/posts/123">
            <p>Caption text about the thing.</p>
            Posted by <a href="https://www.facebook.com/PageName/">PageName</a> on
            <a href="https://www.facebook.com/PageName/posts/123">Tuesday, 3 June 2026</a>
          </blockquote>
        </div>
      </div>
    `

    // The fallback is the only readable copy of the post, so replacing the widget without it
    // would lose the text outright.
    it('should carry every field across, the text included', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        description: 'Caption text about the thing.',
        author: 'PageName',
        date: 'Tuesday, 3 June 2026',
      })
    })
  })

  describe('SDK div, video with an fb.watch short link', () => {
    const value = '<div class="fb-video" data-href="https://fb.watch/abcDEF123/"></div>'

    // The mobile app hands out fb.watch links and publishers paste them into the widget.
    it('should carry every field across from the short link', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://fb.watch/abcDEF123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Ffb.watch%2FabcDEF123%2F',
        url: 'https://fb.watch/abcDEF123/',
      })
    })
  })

  describe('standalone fallback blockquote, no widget div', () => {
    const value = html`
      <blockquote
        cite="https://www.facebook.com/PageName/videos/123/"
        class="fb-xfbml-parse-ignore"
      >
        <p>A video caption.</p>
        Posted by <a href="https://www.facebook.com/PageName/">PageName</a> on
        <a href="https://www.facebook.com/PageName/videos/123/">Wednesday, 4 June 2026</a>
      </blockquote>
    `

    // Nothing names the plugin here, so the path in `cite` decides which one it is.
    it('should carry every field across, from the cite url alone', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
        description: 'A video caption.',
        author: 'PageName',
        date: 'Wednesday, 4 June 2026',
      })
    })
  })

  describe('fallback whose byline is not the dialog shape', () => {
    const value = html`
      <div class="fb-post" data-href="https://www.facebook.com/PageName/posts/123">
        <div class="fb-xfbml-parse-ignore">
          <blockquote cite="https://www.facebook.com/PageName/posts/123">
            <p>Caption only, no byline anchors.</p>
          </blockquote>
        </div>
      </div>
    `

    // "Posted by {page} on {date}" is a fixed pair of anchors. Anything else is a hand-edited
    // fallback, so the text is kept and no author or date is invented from it.
    it('should keep the text and claim no author or date', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        description: 'Caption only, no byline anchors.',
      })
    })
  })

  describe('a fallback blockquote citing somewhere else entirely', () => {
    const value = html`
      <blockquote
        cite="https://evil.test/facebook.com/posts/123"
        class="fb-xfbml-parse-ignore"
      >
        <p>Not a facebook post.</p>
      </blockquote>
    `

    it('should be left alone', async () => {
      const result = await convert(value)

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Not a facebook post.')
    })
  })

  describe('bare SDK loader beside the widget', () => {
    const value = html`
      <div id="fb-root"></div>
      <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1"></script>
      <p>Article text.</p>
    `

    it('should leave nothing of the loader behind', async () => {
      const result = await convert(value)

      expect(result).not.toContain('fb-root')
      expect(result).not.toContain('connect.facebook.net')
      expect(result).toContain('Article text.')
    })
  })

  describe('entity-escaped embed from an Atom content payload', () => {
    const value =
      '&lt;iframe src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"&gt;&lt;/iframe&gt;'

    // The escaping is undone upstream by decodeDoubleEncodedTags, so the embed arrives as the
    // plain modern iframe.
    it('should carry every field across once decoded', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      })
    })
  })

  describe('the page-promo widgets, which are chrome and not content', () => {
    const value = html`
      <div class="fb-like" data-href="https://www.facebook.com/PageName"></div>
      <p>Article text.</p>
    `

    it('should strip a fb-like rather than resolve it', async () => {
      const result = await convert(value)

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('Article text.')
    })
  })
})

// Shapes the 200-file sample behind the corpus doc did not contain, found by probing the
// pipeline (2026-08-11). Kept in their own group because their prevalence is unmeasured.
describeForEachParser('facebook shapes outside the sampled variants', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  describe('legacy fb:post XFBML tag', () => {
    const value = '<fb:post href="https://www.facebook.com/PageName/posts/123"></fb:post>'

    // It is an empty element, so before it resolved it was deleted as an empty tag and the
    // post vanished with it.
    it('should carry every field across rather than be dropped as empty', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      })
    })
  })

  describe('amp-facebook component', () => {
    it('should resolve a post to the post plugin', async () => {
      const value = html`
        <amp-facebook
          width="552"
          height="303"
          data-href="https://www.facebook.com/PageName/posts/123"
        ></amp-facebook>
      `

      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        width: '552',
        height: '303',
      })
    })

    it('should follow data-embed-as to the video plugin', async () => {
      const value = html`
        <amp-facebook
          data-embed-as="video"
          data-href="https://www.facebook.com/PageName/videos/123/"
        ></amp-facebook>
      `

      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
      })
    })

    // A comment thread is page chrome, not the article's content.
    it('should leave a comment embed unresolved', async () => {
      const value = html`
        <amp-facebook
          data-embed-as="comment"
          data-href="https://www.facebook.com/PageName/posts/123"
        ></amp-facebook>
      `

      expect(await convert(value)).not.toContain('data-embed-provider')
    })
  })

  describe('legacy video/embed iframe', () => {
    const value = '<iframe src="https://www.facebook.com/video/embed?video_id=123456"></iframe>'

    it('should rebuild it onto the current plugin and the watch page', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'facebook',
        id: '123456',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D123456',
        url: 'https://www.facebook.com/watch/?v=123456',
      })
    })
  })

  describe('the page and comment widgets, which are chrome', () => {
    it('should not resolve a fb-page timeline', async () => {
      const value = '<div class="fb-page" data-href="https://www.facebook.com/PageName"></div>'

      expect(await convert(value)).not.toContain('data-embed-provider')
    })

    it('should not resolve a comments plugin iframe', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fpost"
        ></iframe>
      `

      expect(await convert(value)).not.toContain('data-embed-provider')
    })
  })
})
