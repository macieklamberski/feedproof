import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, jsonAttrValue, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  instagramAmpEmbedResolver,
  instagramBlockquoteEmbedResolver,
  instagramIframeEmbedResolver,
  instagramResolveEmbed,
  instagramSubstackEmbedResolver,
  readInstagramHeight,
} from './instagram.js'

describeForEachParser('instagramBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, instagramBlockquoteEmbedResolver)

  describe('the current captioned blockquote', () => {
    it('should mint the captioned frame and name the account', async () => {
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
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The skeleton's own "View this post on Instagram" line is the only other text this shape
    // carries, and it is chrome rather than the post.
    it('should state no description when the quote carries no caption', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          data-instgrm-version="14"
        >
          <div>
            <a href="https://www.instagram.com/p/CaUsPbUquKV/">View this post on Instagram</a>
            <p>
              <a href="https://www.instagram.com/p/CaUsPbUquKV/">A post shared by X (@someuser)</a>
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
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the uncaptioned blockquote', () => {
    it('should mint the plain frame when the caption flag is absent', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          data-instgrm-version="14"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the reel permalink', () => {
    it('should keep the reel path in the id, the frame and the url', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/?utm_source=ig_embed"
          data-instgrm-version="14"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the plural reels spelling as the same path', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reels/DGPdABWz84n/"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A sound page, not a post: the kind would read as a reel and the literal `audio` as the
    // shortcode. Instagram spells it under both the singular and the plural.
    it.each([
      'https://www.instagram.com/reels/audio/1234567890/',
      'https://www.instagram.com/reel/audio/1234567890/',
      'https://www.instagram.com/reels/audio',
    ])('should not read the sound page %s as a post', async (url) => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="${url}"
        ></blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The boundary keeps a real shortcode that merely begins with those letters.
    it('should still read a shortcode beginning with audio', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/reels/audioXYZ123/"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'reel/audioXYZ123',
        src: 'https://www.instagram.com/reel/audioXYZ123/embed/',
        url: 'https://www.instagram.com/reel/audioXYZ123/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the retired IGTV permalink', () => {
    it('should keep the tv path', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/tv/BgPrjlfHcoB/"
          data-instgrm-version="13"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'tv/BgPrjlfHcoB',
        src: 'https://www.instagram.com/tv/BgPrjlfHcoB/embed/',
        url: 'https://www.instagram.com/tv/BgPrjlfHcoB/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the dated blockquote', () => {
    it('should lift the caption, the account and the timestamp', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="https://www.instagram.com/p/BgPrjlfHcoB/"
          data-instgrm-version="8"
        >
          <div style="padding:8px;">
            <div style="background:#F8F8F8;">
              <div style="height:44px;"></div>
            </div>
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the displayed date when the time states none', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/BgPrjlfHcoB',
        src: 'https://www.instagram.com/p/BgPrjlfHcoB/embed/',
        url: 'https://www.instagram.com/p/BgPrjlfHcoB/',
        author: '@jervoisakl',
        date: 'Mar 21, 2018',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the legacy blockquote without a permalink attribute', () => {
    it('should recover the post from the inner anchor', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-version="7"
        >
          <div style="padding:8px;">
            <a href="https://www.instagram.com/p/BXCsBz8AnKt/" target="_blank">An old caption</a>
          </div>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/BXCsBz8AnKt',
        src: 'https://www.instagram.com/p/BXCsBz8AnKt/embed/captioned/',
        url: 'https://www.instagram.com/p/BXCsBz8AnKt/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Deliberate: with no byline to place it against, a lone line of text is as likely to be the
    // widget's own chrome ("A post shared by @user", "Instagram post") as the post's caption.
    it('should state no description when nothing marks the byline', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-version="7"
        >
          <p>
            <a href="https://www.instagram.com/p/BXCsBz8AnKt/">An old caption</a>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/BXCsBz8AnKt',
        src: 'https://www.instagram.com/p/BXCsBz8AnKt/embed/',
        url: 'https://www.instagram.com/p/BXCsBz8AnKt/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the sanitized blockquote', () => {
    it('should resolve when every data attribute has been stripped', async () => {
      const value = html`
        <blockquote class="instagram-media">
          <div>
            <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_source=ig_embed" target="_blank">
              <p>A post shared by @someuser</p>
            </a>
          </div>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
        author: '@someuser',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the newsletter stub', () => {
    it('should resolve the anchor-only quote a newsletter platform leaves behind', async () => {
      const value = html`
        <blockquote
          align="center"
          class="instagram-media"
        >
          <a href="https://www.instagram.com/p/CaUsPbUquKV/?utm_medium=newsletter">
            <p dir="ltr" lang="en">Instagram post</p>
          </a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the plugin-compounded class', () => {
    it('should match a quote a plugin gave extra classes', async () => {
      const value = html`
        <blockquote
          class="instagram-media sbi-embed publive-Instagram-block"
          contenteditable="false"
          data-instgrm-permalink="https://www.instagram.com/reel/DGPdABWz84n/"
          data-instgrm-version="14"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the Gutenberg figure wrapper', () => {
    it('should resolve the quote inside the block wrapper', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the Tumblr figure wrapper', () => {
    it('should carry the size the wrapper states', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'reel/DGPdABWz84n',
        src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/',
        url: 'https://www.instagram.com/reel/DGPdABWz84n/',
        width: 540,
        height: 627,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should recover the post from the wrapper when the quote names none', async () => {
      const value = html`
        <figure
          class="tmblr-embed"
          data-provider="instagram"
          data-url="https%3A%2F%2Fwww.instagram.com%2Fp%2FCaUsPbUquKV%2F"
        >
          <blockquote class="instagram-media"></blockquote>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the url as written when its percent-encoding is malformed', async () => {
      const value = html`
        <figure
          class="tmblr-embed"
          data-provider="instagram"
          data-url="https://www.instagram.com/p/CaUsPbUquKV/?x=%ZZ"
        >
          <blockquote class="instagram-media"></blockquote>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no size when the wrapper gives only one dimension', async () => {
      const value = html`
        <figure
          class="tmblr-embed"
          data-provider="instagram"
          data-orig-width="540"
        >
          <blockquote
            class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/p/CaUsPbUquKV/"
          ></blockquote>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // A sanitizer that strips class attributes keeps data attributes, so the quote arrives naming
  // its post in the permalink and nothing else. 53 of the 11,951 feeds carrying the permalink
  // attribute have no `instagram-media` class anywhere (markup census, 12.7M feeds).
  describe('the class-stripped blockquote', () => {
    it('should mint the frame from the permalink alone', async () => {
      const value = html`
        <blockquote
          data-instgrm-permalink="https://www.instagram.com/p/CpiRiksOLDF/?utm_source=ig_embed&amp;utm_campaign=loading"
          data-instgrm-version="14"
          style="background: #FFF; border: 0; border-radius: 3px; margin: 1px; padding: 0;"
        >
          <div style="padding: 16px">
            <a href="https://www.instagram.com/p/CpiRiksOLDF/" target="_blank">
              <div>View this post on Instagram</div>
            </a>
          </div>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CpiRiksOLDF',
        src: 'https://www.instagram.com/p/CpiRiksOLDF/embed/',
        url: 'https://www.instagram.com/p/CpiRiksOLDF/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when nothing names a post', async () => {
      const value = html`
        <blockquote class="instagram-media">
          <p>Some text and no link at all.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a post path on a lookalike host', async () => {
      const value = html`
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://instagram.com.evil.test/p/CaUsPbUquKV/"
        ></blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an instagram url naming no post', async () => {
      const value = html`
        <blockquote class="instagram-media">
          <a href="https://www.instagram.com/someuser/">Some User</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('instagramIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, instagramIframeEmbedResolver)

  describe('the stored-after-render frame', () => {
    it('should rebuild the frame without the embedding page in its query', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CaUsPbUquKV',
        src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
        url: 'https://www.instagram.com/p/CaUsPbUquKV/',
        height: 640,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined for another host carrying the post path', async () => {
      const value = html`
        <iframe src="https://evil.test/www.instagram.com/p/CaUsPbUquKV/embed/"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('instagramResolveEmbed', () => {
  it('should resolve the frame a generator pastes directly', () => {
    const value = 'https://www.instagram.com/p/CaUsPbUquKV/embed/'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  it('should keep the captioned form of the frame', () => {
    const value = 'https://www.instagram.com/reel/DGPdABWz84n/embed/captioned/'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'reel/DGPdABWz84n',
      src: 'https://www.instagram.com/reel/DGPdABWz84n/embed/captioned/',
      url: 'https://www.instagram.com/reel/DGPdABWz84n/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  it('should read the legacy short host', () => {
    const value = 'https://instagr.am/p/CaUsPbUquKV/'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  // The app's share sheet writes the account in front of the post today. It names the poster
  // rather than the post, so the placeholder is the same one the bare path yields.
  it('should read a post addressed through its account', () => {
    const value = 'https://www.instagram.com/aseverofficial/p/CaUsPbUquKV/?utm_source=ig_embed'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  it('should read a reel addressed through its account', () => {
    const value = 'https://www.instagram.com/aseverofficial/reel/CaUsPbUquKV/'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'reel/CaUsPbUquKV',
      src: 'https://www.instagram.com/reel/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/reel/CaUsPbUquKV/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for an account page naming no post', () => {
    const value = 'https://www.instagram.com/makoto57gpr?igsh=MWVhNHdjZXZvbDByZA=='

    expect(instagramResolveEmbed(value)).toBeUndefined()
  })

  // `audio` sits where a shortcode does but names the sound a reel used, not a post. Instagram
  // spells the route under both the singular and the plural, and either reads as a post without
  // the exclusion.
  it.each([
    'https://www.instagram.com/reels/audio/123456789/',
    'https://www.instagram.com/reel/audio/123456789/',
    'https://www.instagram.com/reels/audio',
  ])('should return undefined for the sound page %s', (value) => {
    expect(instagramResolveEmbed(value)).toBeUndefined()
  })

  // The exclusion is a whole segment, so a real shortcode merely beginning with those five
  // letters still resolves.
  it('should still read a shortcode beginning with audio', () => {
    const value = 'https://www.instagram.com/reels/audioXYZ123/'
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'reel/audioXYZ123',
      src: 'https://www.instagram.com/reel/audioXYZ123/embed/',
      url: 'https://www.instagram.com/reel/audioXYZ123/',
    }

    expect(instagramResolveEmbed(value)).toEqual(expected)
  })

  // Instagram's own routes take the same shape as a handle, and the share route names a
  // different id space: reading its token as a shortcode would mint a frame that cannot load.
  it.each([
    'https://www.instagram.com/share/p/BAJ0RmC0Vq/',
    'https://www.instagram.com/share/reel/BAJ0RmC0Vq/',
    'https://www.instagram.com/explore/p/CaUsPbUquKV/',
    'https://www.instagram.com/stories/p/CaUsPbUquKV/',
    'https://www.instagram.com/accounts/p/CaUsPbUquKV/',
  ])('should return undefined for %s', (value) => {
    expect(instagramResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a profile frame', () => {
    const value = 'https://www.instagram.com/someuser/embed/'

    expect(instagramResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(instagramResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('instagramAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, instagramAmpEmbedResolver)

  it('should build the captioned frame from the shortcode', async () => {
    const value = html`
      <amp-instagram
        data-shortcode="CaUsPbUquKV"
        data-captioned
        layout="responsive"
        width="320"
        height="392"
      ></amp-instagram>
    `
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/captioned/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      width: 320,
      height: 392,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should read the bare shortcode attribute the component also accepts', async () => {
    const value = html`
      <amp-instagram
        shortcode="CaUsPbUquKV"
        width="320"
        height="392"
      ></amp-instagram>
    `
    const expected: EmbedResolverResult = {
      provider: 'instagram',
      id: 'p/CaUsPbUquKV',
      src: 'https://www.instagram.com/p/CaUsPbUquKV/embed/',
      url: 'https://www.instagram.com/p/CaUsPbUquKV/',
      width: 320,
      height: 392,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for a shortcode outside the url-safe alphabet', async () => {
    const value = '<amp-instagram data-shortcode="../evil"></amp-instagram>'

    expect(await extract(value)).toBeUndefined()
  })
})

describeForEachParser('instagramSubstackEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, instagramSubstackEmbedResolver)

  // Substack ships the wrapper childless, with the whole card as JSON in `data-attrs`, stored
  // in a double-quoted attribute with the inner quotes HTML-encoded, which is what survives a
  // parse and serialise roundtrip.
  const makeContainer = (attrs: Record<string, unknown> | string): string => {
    return html`
      <div
        class="instagram-embed-wrap"
        data-attrs="${jsonAttrValue(attrs)}"
        data-component-name="InstagramToDOM"
      ></div>
    `
  }

  describe('the current payload', () => {
    it('should read the caption-bearing title, the author and the rehosted images', async () => {
      const value = makeContainer({
        instagram_id: 'DZmgID9Eawg',
        title: 'BBC News on Instagram: "Pakistan\'s prime minister says a peace …',
        author_name: '@bbcnews',
        thumbnail_url:
          'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-snapshot-DZmgID9Eawg.jpg',
        like_count: 6554,
        comment_count: 7697,
        profile_pic_url:
          'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-profile-pic-DZmgID9Eawg.png',
        follower_count: null,
        timestamp: null,
        belowTheFold: true,
      })
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/DZmgID9Eawg',
        src: 'https://www.instagram.com/p/DZmgID9Eawg/embed/',
        url: 'https://www.instagram.com/p/DZmgID9Eawg/',
        description: 'BBC News on Instagram: "Pakistan\'s prime minister says a peace …',
        author: '@bbcnews',
        avatar:
          'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-profile-pic-DZmgID9Eawg.png',
        thumbnail:
          'https://substack-post-media.s3.amazonaws.com/public/images/__ss-rehost__IG-snapshot-DZmgID9Eawg.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the boilerplate-title payload', () => {
    // Deliberate: "A post shared by {author}" is the page title's fallback form, duplicating
    // `author_name`, so publishing it as the post's text would say nothing the byline does not.
    it('should drop the title and prefix the bare handle', async () => {
      const value = makeContainer({
        instagram_id: 'BsozzXrhcLu',
        title: 'A post shared by @zandercutt',
        author_name: 'zandercutt',
        thumbnail_url:
          'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com/public/images/__ss-rehost__IG-BsozzXrhcLu.jpg',
      })
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/BsozzXrhcLu',
        src: 'https://www.instagram.com/p/BsozzXrhcLu/embed/',
        url: 'https://www.instagram.com/p/BsozzXrhcLu/',
        author: '@zandercutt',
        thumbnail:
          'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com/public/images/__ss-rehost__IG-BsozzXrhcLu.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the earliest payload', () => {
    // Deliberate: this era passed Instagram's own CDN url through un-rehosted. It is signed
    // and long expired, and a dead thumbnail is worse than none, so only the stamped copies
    // are kept.
    it('should keep the bare caption and the date but not the expiring thumbnail', async () => {
      const value = makeContainer({
        instagram_id: 'B-aCA0LhRiq',
        title: 'We can all use some flowers to make us smile. Spring in NYC.',
        author_name: 'thuyanj1',
        thumbnail_url:
          'https://scontent.cdninstagram.com/v/t51.2885-15/e35/s480x480/91252884_606008746674680_2338248453310937580_n.jpg?_nc_ht=scontent.cdninstagram.com&oh=fa18e95a423e5ad00f1c63d96aa7b516&oe=5FC16EAF',
        timestamp: '2020-03-31T17:40:31.000Z',
      })
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/B-aCA0LhRiq',
        src: 'https://www.instagram.com/p/B-aCA0LhRiq/embed/',
        url: 'https://www.instagram.com/p/B-aCA0LhRiq/',
        description: 'We can all use some flowers to make us smile. Spring in NYC.',
        author: '@thuyanj1',
        date: '2020-03-31T17:40:31.000Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the class-stripped div', () => {
    it('should resolve through the component name when the class is gone', async () => {
      const value = html`
        <div
          data-attrs="${jsonAttrValue({ instagram_id: 'CdWN1jeOWr0' })}"
          data-component-name="InstagramToDOM"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'instagram',
        id: 'p/CdWN1jeOWr0',
        src: 'https://www.instagram.com/p/CdWN1jeOWr0/embed/',
        url: 'https://www.instagram.com/p/CdWN1jeOWr0/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when data-attrs is absent', async () => {
      const value = '<div data-component-name="InstagramToDOM"></div>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      const value = makeContainer('not-json')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the payload names no post', async () => {
      const value = makeContainer({ author_name: 'someuser' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a shortcode outside the url-safe alphabet', async () => {
      const value = makeContainer({ instagram_id: '../evil' })

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('readInstagramHeight', () => {
  it('should read the height out of a measurement', () => {
    const value = { details: { height: 1003 }, type: 'MEASURE' }

    expect(readInstagramHeight(value)).toBe(1003)
  })

  it('should read nothing out of the lifecycle messages', () => {
    const mounted = {
      details: { styles: [['boxShadow', 'none']] },
      type: 'MOUNTED',
    }

    expect(readInstagramHeight({ details: {}, type: 'LOADING' })).toBeUndefined()
    expect(readInstagramHeight(mounted)).toBeUndefined()
  })
})
