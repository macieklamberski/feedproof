import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  facebookAmpEmbedResolver,
  facebookBlockquoteEmbedResolver,
  facebookIframeEmbedResolver,
  facebookResolveEmbed,
  facebookWidgetEmbedResolver,
  facebookXfbmlEmbedResolver,
} from './facebook.js'

describeForEachParser('facebookWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, facebookWidgetEmbedResolver)

  describe('the post div', () => {
    it('should mint the post plugin url from the data-href', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the href query encoded in the plugin url', async () => {
      const value = html`
        <div
          class="fb-post"
          data-href="https://www.facebook.com/renodancecompany/photos/317243261734291/?type=1"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/renodancecompany/photos/317243261734291/?type=1',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Frenodancecompany%2Fphotos%2F317243261734291%2F%3Ftype%3D1',
        url: 'https://www.facebook.com/renodancecompany/photos/317243261734291/?type=1',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the video div', () => {
    it('should mint the video plugin url from the data-href', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })

    // The mobile app hands out fb.watch links and publishers paste them into the widget.
    it('should mint the plugin url from an fb.watch short link', async () => {
      const value = html`
        <div
          class="fb-video"
          data-href="https://fb.watch/abcDEF123/"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://fb.watch/abcDEF123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Ffb.watch%2FabcDEF123%2F',
        url: 'https://fb.watch/abcDEF123/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the dialog fallback blockquote inside the div', () => {
    // The fallback is the only readable copy of the post, so replacing the widget without it
    // would lose the text outright.
    it('should lift the text, the page and the date out of it', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        description: 'Caption text about the thing.',
        author: 'PageName',
        date: 'Tuesday, 3 June 2026',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // "Posted by {page} on {date}" is a fixed pair of anchors. Anything else is a hand-edited
    // fallback, so the text is kept and no author or date is invented from it.
    it('should keep the text and claim no author or date from another byline', async () => {
      const value = html`
        <div class="fb-post" data-href="https://www.facebook.com/PageName/posts/123">
          <div class="fb-xfbml-parse-ignore">
            <blockquote cite="https://www.facebook.com/PageName/posts/123">
              <p>Caption only, no byline anchors.</p>
            </blockquote>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        description: 'Caption only, no byline anchors.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an empty data-href', async () => {
      const value = html`
        <div
          class="fb-post"
          data-href=""
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a post div without the data-href attribute', async () => {
      const value = html`
        <div
          class="fb-post"
          data-width="466"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-facebook href', async () => {
      const value = html`
        <div
          class="fb-post"
          data-href="https://evil.test/facebook.com/post"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', async () => {
      const value = html`
        <div
          class="fb-video"
          data-href="https://facebook.com.evil.test/videos/732638203506014/"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The page-promo widgets are chrome rather than article content, the same family as the
    // share buttons, so the selector deliberately stops short of them.
    it('should not match a fb-like button', async () => {
      const value = html`
        <div
          class="fb-like"
          data-href="https://www.facebook.com/PageName"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a fb-page timeline', async () => {
      const value = html`
        <div
          class="fb-page"
          data-href="https://www.facebook.com/PageName"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookXfbmlEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, facebookXfbmlEmbedResolver)

  describe('happy paths', () => {
    it('should mint the post plugin url from the plain href', async () => {
      const value = '<fb:post href="https://www.facebook.com/PageName/posts/123"></fb:post>'
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a non-facebook href', async () => {
      const value = '<fb:post href="https://evil.test/facebook.com/posts/123"></fb:post>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, facebookAmpEmbedResolver)

  describe('happy paths', () => {
    it('should resolve a post to the post plugin and keep the declared size', async () => {
      const value = html`
        <amp-facebook
          width="552"
          height="303"
          data-href="https://www.facebook.com/PageName/posts/123"
        ></amp-facebook>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        width: 552,
        height: 303,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should follow data-embed-as to the video plugin', async () => {
      const value = html`
        <amp-facebook
          data-embed-as="video"
          data-href="https://www.facebook.com/PageName/videos/123/"
        ></amp-facebook>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A comment thread is page chrome, not the article's content.
    it('should leave a comment embed unresolved', async () => {
      const value = html`
        <amp-facebook
          data-embed-as="comment"
          data-href="https://www.facebook.com/PageName/posts/123"
        ></amp-facebook>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a non-facebook href', async () => {
      const value = html`
        <amp-facebook
          data-href="https://evil.test/facebook.com/posts/123"
        ></amp-facebook>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, facebookBlockquoteEmbedResolver)

  describe('happy paths', () => {
    // The publisher kept the dialog's fallback and dropped the widget div, so nothing names
    // the plugin and the path in `cite` decides which one it is.
    it('should read the video plugin and the text from the cite url alone', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
        description: 'A video caption.',
        author: 'PageName',
        date: 'Wednesday, 4 June 2026',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the post plugin for any other path', async () => {
      const value = html`
        <blockquote
          cite="https://www.facebook.com/PageName/posts/123"
          class="fb-xfbml-parse-ignore"
        >
          <p>A post caption.</p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        description: 'A post caption.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a cite pointing somewhere else entirely', async () => {
      const value = html`
        <blockquote
          cite="https://evil.test/facebook.com/posts/123"
          class="fb-xfbml-parse-ignore"
        >
          <p>Not a facebook post.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a blockquote with no cite', async () => {
      const value = html`
        <blockquote class="fb-xfbml-parse-ignore">
          <p>No cite at all.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('facebookIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, facebookIframeEmbedResolver)

  describe('happy paths', () => {
    it('should name a post plugin iframe and keep the publisher src', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123&show_text=true&width=500"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123&show_text=true&width=500',
        url: 'https://www.facebook.com/PageName/posts/123',
        width: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should name a video plugin iframe', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Older SDKs built the plugin url with their Graph API version in the path, and those
    // copies still serve the same plugin.
    it('should accept the versioned post plugin path', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/v2.5/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/v2.5/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should accept the versioned video plugin path with a two-digit version', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/v17.0/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/v17.0/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The pre-plugins endpoint from old posts, which names its video in `video_id` rather than
    // an encoded href, so the current plugin url has to be built from scratch.
    it('should rebuild a legacy video frame onto the current plugin', async () => {
      const value = '<iframe src="https://www.facebook.com/video/embed?video_id=123456"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: '123456',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D123456',
        url: 'https://www.facebook.com/watch/?v=123456',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The size a Facebook embed gets depends on which shape it arrived as, so each one is
  // asserted separately.
  describe('size sources', () => {
    it('should take the size off the element when the url states none', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
          width="500"
          height="500"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
        width: 500,
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take a landscape 560x314 from the plugin query', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&show_text=false&width=560"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&show_text=false&width=560',
        url: 'https://www.facebook.com/PageName/videos/123/',
        width: 560,
        height: 314,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A Reel is taller than it is wide, so a shared default would render it in a landscape box.
    it('should keep a Reel vertical at 267x476 rather than a video default', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&width=267"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/reel/123/',
        src: 'https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123%2F&show_text=false&width=267',
        url: 'https://www.facebook.com/reel/123/',
        width: 267,
        height: 476,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A post's height follows its own content and Facebook publishes no signal for it, so
    // guessing one would be worse than leaving it to the consumer.
    it('should carry no size when neither the element nor the url states one', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/posts/123',
        src: 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123',
        url: 'https://www.facebook.com/PageName/posts/123',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the width alone when the query states only that', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&width=560"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F&width=560',
        url: 'https://www.facebook.com/PageName/videos/123/',
        width: 560,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The dialog never writes a zero, so one is a mangled copy and not a measurement. Each
    // dimension is judged on its own, so the honest height survives.
    it('should reject a zero width from the plugin query and keep the height', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/video.php?width=0&height=314&href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'facebook',
        id: 'https://www.facebook.com/PageName/videos/123/',
        src: 'https://www.facebook.com/plugins/video.php?width=0&height=314&href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fvideos%2F123%2F',
        url: 'https://www.facebook.com/PageName/videos/123/',
        height: 314,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a facebook url that is not a plugin', async () => {
      const value = '<iframe src="https://www.facebook.com/PageName/posts/123"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a plugin href on a lookalike host', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Ffacebook.com.evil.test%2Fposts%2F123"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a plugin url with no href', async () => {
      const value = '<iframe src="https://www.facebook.com/plugins/post.php?width=500"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // A comment thread is page chrome, not the article's content.
    it('should return undefined for the comments plugin', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fpost"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The version segment widens the path match, not the plugin set: a like button and a page
    // timeline stay chrome whichever SDK era wrote them.
    it('should return undefined for a versioned like plugin', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/v2.5/plugins/like.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a versioned page plugin', async () => {
      const value = html`
        <iframe
          src="https://www.facebook.com/v2.5/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('facebookResolveEmbed', () => {
  it('should return undefined for a url that does not parse', () => {
    const value = 'not a url'

    expect(facebookResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a legacy video frame with no video_id', () => {
    const value = 'https://www.facebook.com/video/embed?autoplay=1'

    expect(facebookResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a legacy video frame with a non-numeric id', () => {
    const value = 'https://www.facebook.com/video/embed?video_id=../etc'

    expect(facebookResolveEmbed(value)).toBeUndefined()
  })
})

// The three contracts no single resolver can state, because each one is a handoff between
// passes that know nothing about each other.
describeForEachParser('facebook through the pipeline', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  // `<fb:post>` is an empty element, so the widget pass has to claim it before the empty-tag
  // pass reaches it or the post disappears with the tag.
  it('should claim the empty fb:post tag before it is dropped as empty', async () => {
    const value = '<fb:post href="https://www.facebook.com/PageName/posts/123"></fb:post>'
    const expected = html`
      <div
        data-embed-src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/posts/123"
        data-embed-url="https://www.facebook.com/PageName/posts/123"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // The escaping is undone upstream by decodeDoubleEncodedTags, so the embed only becomes an
  // iframe partway through the run.
  it('should resolve an embed that arrives entity-escaped in an Atom payload', async () => {
    const value =
      '&lt;iframe src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"&gt;&lt;/iframe&gt;'
    const expected = html`
      <div
        data-embed-src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FPageName%2Fposts%2F123"
        data-embed-provider="facebook"
        data-embed-id="https://www.facebook.com/PageName/posts/123"
        data-embed-url="https://www.facebook.com/PageName/posts/123"
      ></div>
    `
    const result = await convert(value)

    expect(result).toEqualHtml(expected)
  })

  // The SDK loader is scaffolding no resolver looks at: the root div and the script have to be
  // gone by the end of the run, and the article text has to survive them.
  it('should leave nothing of the bare SDK loader behind', async () => {
    const value = html`
      <div id="fb-root"></div>
      <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1"></script>
      <p>Article text.</p>
    `
    const expected = html`<p>Article text.</p>`

    expect(await convert(value)).toEqualHtml(expected)
  })
})
