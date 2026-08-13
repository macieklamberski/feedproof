import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  instagramEmbedResolver,
  instagramIframeEmbedResolver,
  instagramLazyEmbedResolver,
  instagramResolveEmbed,
} from './instagram.js'

describeForEachParser('instagramEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(instagramEmbedResolver.selector)

    return element ? (instagramEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  describe('the current captioned blockquote', () => {
    it('should mint the captioned frame and name the account', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed&amp;utm_campaign=loading"
          data-instgrm-version="14"
          style=" background:#FFF; border:0; max-width:540px;"
        >
          <div style="padding:16px;">
            <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">
              <div style="height: 40px; width: 40px;"></div>
              <div>View this post on Instagram</div>
            </a>
            <p style="color:#c9c8cd;">
              <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">
                A post shared by Some User (@someuser)
              </a>
            </p>
          </div>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
        author: '@someuser',
        description: undefined,
        date: undefined,
      }

      expect(extract(value)).toEqual(expected)
    })

    // The skeleton's own "View this post on Instagram" line is the only other text this shape
    // carries, and it is chrome rather than the post.
    it('should state no description when the quote carries no caption', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          data-instgrm-version="14"
        >
          <div>
            <a href="https://www.instagram.com/p/CaUsPbUquKV/">View this post on Instagram</a>
            <p><a href="https://www.instagram.com/p/CaUsPbUquKV/">A post shared by X (@someuser)</a></p>
          </div>
        </blockquote>
      `

      expect(extract(value)?.description).toBeUndefined()
    })
  })

  describe('the uncaptioned blockquote', () => {
    it('should mint the plain frame when the caption flag is absent', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          data-instgrm-version="14"
        ></blockquote>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
        author: undefined,
        description: undefined,
        date: undefined,
      })
    })
  })

  describe('the reel permalink', () => {
    it('should keep the reel path in the id, the frame and the url', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/?utm_source=ig_embed"
          data-instgrm-version="14"
        ></blockquote>
      `

      expect(extract(value)).toMatchObject({
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
      })
    })

    it('should read the plural reels spelling as the same path', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reels/DGPdABWz84n/"
        ></blockquote>
      `

      expect(extract(value)).toMatchObject({ id: 'reel/DGPdABWz84n' })
    })
  })

  describe('the retired IGTV permalink', () => {
    it('should keep the tv path', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/tv/BgPrjlfHcoB/"
          data-instgrm-version="13"
        ></blockquote>
      `

      expect(extract(value)).toMatchObject({
        id: 'tv/BgPrjlfHcoB',
        src: 'https://www.instagram.com/tv/BgPrjlfHcoB/embed/',
      })
    })
  })

  describe('the dated blockquote', () => {
    it('should lift the caption, the account and the timestamp', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="https://www.instagram.com/p/BgPrjlfHcoB/"
          data-instgrm-version="8"
        >
          <div style="padding:8px;">
            <div style="background:#F8F8F8;"><div style="height:44px;"></div></div>
            <p style="margin:8px 0 0 0;">
              <a href="https://www.instagram.com/p/BgPrjlfHcoB/" target="_blank">
                Bring some friends, a special one, or them all.
              </a>
            </p>
            <p style="color:#c9c8cd;">
              A post shared by
              <a href="https://www.instagram.com/jervoisakl/" target="_blank">Jervois Steak House</a>
              (@jervoisakl) on
              <time datetime="2018-03-22T01:45:03+00:00">Mar 21, 2018 at 6:45pm PDT</time>
            </p>
          </div>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/BgPrjlfHcoB',
        src: 'https://www.instagram.com/p/BgPrjlfHcoB/embed/captioned/',
        url: 'https://www.instagram.com/p/BgPrjlfHcoB/',
        description: 'Bring some friends, a special one, or them all.',
        author: '@jervoisakl',
        date: '2018-03-22T01:45:03+00:00',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should fall back to the displayed date when the time states none', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/p/BgPrjlfHcoB/"
        >
          <p>
            A post shared by <a href="https://www.instagram.com/jervoisakl/">Jervois</a>
            (@jervoisakl) on <time>Mar 21, 2018</time>
          </p>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({ date: 'Mar 21, 2018' })
    })
  })

  describe('the legacy blockquote without a permalink attribute', () => {
    it('should recover the post from the inner anchor', () => {
      const value = html`
        <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-version="7">
          <div style="padding:8px;">
            <a href="https://www.instagram.com/p/BXCsBz8AnKt/" target="_blank">An old caption</a>
          </div>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        id: 'p/BXCsBz8AnKt',
        src: 'https://www.instagram.com/p/BXCsBz8AnKt/embed/captioned/',
      })
    })

    // Deliberate: with no byline to place it against, a lone line of text is as likely to be the
    // widget's own chrome ("A post shared by @user", "Instagram post") as the post's caption.
    it('should state no description when nothing marks the byline', () => {
      const value = html`
        <blockquote class="instagram-media" data-instgrm-version="7">
          <p><a href="https://www.instagram.com/p/BXCsBz8AnKt/">An old caption</a></p>
        </blockquote>
      `

      expect(extract(value)?.description).toBeUndefined()
    })
  })

  describe('the sanitized blockquote', () => {
    it('should resolve when every data attribute has been stripped', () => {
      const value = html`
        <blockquote class="instagram-media">
          <div>
            <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">
              <p>A post shared by @someuser</p>
            </a>
          </div>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        id: 'p/CaUsPbUquKV',
        author: '@someuser',
      })
    })
  })

  describe('the newsletter stub', () => {
    it('should resolve the anchor-only quote a newsletter platform leaves behind', () => {
      const value = html`
        <blockquote align="center" class="instagram-media">
          <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_medium=newsletter">
            <p dir="ltr" lang="en">Instagram post</p>
          </a>
        </blockquote>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
        author: undefined,
        description: undefined,
        date: undefined,
      })
    })
  })

  describe('the plugin-compounded class', () => {
    it('should match a quote a plugin gave extra classes', () => {
      const value = html`
        <blockquote
          class="instagram-media sbi-embed publive-Instagram-block"
          contenteditable="false"
          data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/"
          data-instgrm-version="14"
        ></blockquote>
      `

      expect(extract(value)).toMatchObject({ id: 'reel/DGPdABWz84n' })
    })
  })

  describe('the Gutenberg figure wrapper', () => {
    it('should resolve the quote inside the block wrapper', () => {
      const value = html`
        <figure class="wp-block-embed is-type-rich is-provider-instagram wp-block-embed-instagram">
          <div class="wp-block-embed__wrapper">
            <blockquote
              class="instagram-media"
              data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
              data-instgrm-version="14"
            ></blockquote>
          </div>
        </figure>
      `

      expect(extract(value)).toMatchObject({ id: 'p/CaUsPbUquKV' })
    })
  })

  describe('the Tumblr figure wrapper', () => {
    it('should carry the size the wrapper states as a ratio', () => {
      const value = html`
        <figure
          class="tmblr-embed tmblr-full"
          data-provider="instagram"
          data-orig-width="540"
          data-orig-height="627"
          data-url="https%3A%2F%2Fwww.instagram.com%2Freel%2FDGPdABWz84n%2F"
        >
          <blockquote
            class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/"
            data-instgrm-version="14"
          ></blockquote>
        </figure>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
        width: 540,
        height: 627,
        author: undefined,
        description: undefined,
        date: undefined,
      })
    })

    it('should recover the post from the wrapper when the quote names none', () => {
      const value = html`
        <figure
          class="tmblr-embed"
          data-provider="instagram"
          data-url="https%3A%2F%2Fwww.instagram.com%2Fp%2FCaUsPbUquKV%2F"
        >
          <blockquote class="instagram-media"></blockquote>
        </figure>
      `

      expect(extract(value)).toMatchObject({ id: 'p/CaUsPbUquKV' })
    })

    it('should state no size when the wrapper gives only one dimension', () => {
      const value = html`
        <figure class="tmblr-embed" data-provider="instagram" data-orig-width="540">
          <blockquote
            class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          ></blockquote>
        </figure>
      `

      expect(extract(value)?.width).toBeUndefined()
    })
  })

  describe('the AMP component', () => {
    it('should build the captioned frame from the shortcode', () => {
      const value = html`
        <amp-instagram
          data-shortcode="CaUsPbUquKV"
          data-captioned
          layout="responsive"
          width="320"
          height="392"
        ></amp-instagram>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      })
    })

    it('should read the bare shortcode attribute the component also accepts', () => {
      const value = html`<amp-instagram shortcode="CaUsPbUquKV" width="320" height="392"></amp-instagram>`

      expect(extract(value)).toMatchObject({
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      })
    })

    it('should return undefined for a shortcode outside the url-safe alphabet', () => {
      const value = html`<amp-instagram data-shortcode="../evil"></amp-instagram>`

      expect(extract(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined when nothing names a post', () => {
      const value = html`
        <blockquote class="instagram-media">
          <p>Some text and no link at all.</p>
        </blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a post path on a lookalike host', () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://instagram.com.evil.test/p/CaUsPbUquKV/"
        ></blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an instagram url naming no post', () => {
      const value = html`
        <blockquote class="instagram-media">
          <a href="https://www.instagram.com/someuser/">Some User</a>
        </blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('instagramIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(instagramIframeEmbedResolver.selector)

    return element
      ? (instagramIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('the stored-after-render frame', () => {
    it('should rebuild the frame without the embedding page in its query', () => {
      const value = html`
        <iframe
          class="instagram-media instagram-media-rendered"
          src="https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/?cr=1&amp;wp=540&amp;rd=https%3A%2F%2Fexample.com"
          height="640"
          frameborder="0"
          scrolling="no"
          data-instgrm-payload-id="instagram-media-payload-0"
        ></iframe>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      })
    })

    it('should return undefined for another host carrying the post path', () => {
      const value = html`<iframe src="https://evil.test/www.instagram.com/p/CaUsPbUquKV/embed/"></iframe>`

      expect(extract(value)).toBeUndefined()
    })
  })
})

describe('instagramResolveEmbed', () => {
  it('should resolve the frame a generator pastes directly', () => {
    expect(instagramResolveEmbed('https://www.instagram.com/p/CaUsPbUquKV/embed/')).toEqual({
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
    })
  })

  it('should keep the captioned form of the frame', () => {
    expect(
      instagramResolveEmbed('https://www.instagram.com/reel/DGPdABWz84n/embed/captioned/'),
    ).toMatchObject({
      src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/captioned/',
    })
  })

  it('should read the legacy short host', () => {
    expect(instagramResolveEmbed('https://instagr.am/p/CaUsPbUquKV/')).toMatchObject({
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
    })
  })

  it('should return undefined for a profile frame', () => {
    expect(instagramResolveEmbed('https://www.instagram.com/someuser/embed/')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(instagramResolveEmbed('https://[')).toBeUndefined()
  })
})

describeForEachParser('instagramLazyEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(instagramLazyEmbedResolver.selector)

    return element
      ? (instagramLazyEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('the deferred blockquote', () => {
    it('should resolve the parked post and keep its captioned form', () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://www.instagram.com/p/CaUsPbUquKV/"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%20data-instgrm-captioned%3E%3C%2Fblockquote%3E"
        ></div>
      `

      expect(extract(value)).toEqual({
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      })
    })

    it('should mint the plain frame when the parked quote asks for no caption', () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://www.instagram.com/reel/DGPdABWz84n/"
          data-content="%3Cblockquote%20class%3D%22instagram-media%22%3E%3C%2Fblockquote%3E"
        ></div>
      `

      expect(extract(value)).toMatchObject({
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
      })
    })

    it('should return undefined when the parked url is not an instagram post', () => {
      const value = html`
        <div
          class="load-later load-later-vendor-wwwinstagramcom"
          data-url="https://evil.test/www.instagram.com/p/CaUsPbUquKV/"
        ></div>
      `

      expect(extract(value)).toBeUndefined()
    })
  })
})
