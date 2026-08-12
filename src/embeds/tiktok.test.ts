import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { baseContext, describeForEachParser, html } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { tiktokEmbedResolver } from './tiktok.js'

const videoId = '7000000000000000000'

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

describeForEachParser('tiktokEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(tiktokEmbedResolver.selector)

    return element ? (tiktokEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({ ...baseContext, widgetResolvers: [tiktokEmbedResolver] }),
    ])
  }

  describe('happy paths', () => {
    it('should resolve the canonical oembed blockquote', () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456"
          data-video-id="7001234567890123456"
          data-embed-from="oembed"
          style="max-width: 605px; min-width: 325px;"
        >
          <section>
            <a target="_blank" title="@cookingwithlynja" href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a>
            <p>Midnight pasta <a title="#pasta" target="_blank" href="https://www.tiktok.com/tag/pasta">#pasta</a></p>
            <a target="_blank" title="original sound" href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Lynja</a>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        title: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should match a sanitized copy with the class after other attributes', () => {
      const value = html`
        <blockquote
          data-video-id="7001234567890123456"
          cite="https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456"
          class="tiktok-embed"
        >
          <section>
            <a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a>
            <p>Midnight pasta</p>
          </section>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
      })
    })

    it('should still mint the player from the id when the cite is only the bare host', () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/" data-video-id="7001234567890123456">
          <section>
            <a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a>
            <p>Midnight pasta</p>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        title: 'Midnight pasta',
        author: '@cookingwithlynja',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should read the caption and author from the paragraph-wrapped shape', () => {
      // The shape the default pipeline hands to convertWidgets: earlier transforms have
      // wrapped the section's bare author and sound anchors into paragraphs of their own.
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <p><a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a></p>
            <p>Midnight pasta <a href="https://www.tiktok.com/tag/pasta">#pasta</a></p>
            <p><a href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Lynja</a></p>
          </section>
        </blockquote>
      `

      expect(extract(value)).toMatchObject({
        title: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
      })
    })

    it('should omit the url for a cite on a foreign host', () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://example.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section><p>Midnight pasta</p></section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        title: 'Midnight pasta',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should omit the title when the caption paragraph is empty', () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <a href="https://www.tiktok.com/@user">@user</a>
            <p></p>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
        author: '@user',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should omit the author when the first section anchor is not a handle', () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <a href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Artist</a>
          </section>
        </blockquote>
      `

      expect(extract(value)).toEqual({
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
      })
    })
  })

  describe('sad paths', () => {
    it('should not match the creator-profile variant without a video id', () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@cookingwithlynja"
          data-unique-id="cookingwithlynja"
          data-embed-type="creator"
        >
          <section><a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a></section>
        </blockquote>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty video id', () => {
      const value =
        '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/7001234567890123456" data-video-id=""></blockquote>'

      expect(extract(value)).toBeUndefined()
    })
  })

  describe('widget pass', () => {
    it('should replace the blockquote with an embed placeholder', async () => {
      const value = html`
        <p>Watch this one:</p>
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456" data-video-id="7001234567890123456" data-embed-from="oembed">
          <section>
            <a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a>
            <p>Midnight pasta <a href="https://www.tiktok.com/tag/pasta">#pasta</a></p>
          </section>
        </blockquote>
      `
      const result = await transform(value)

      expect(result).toContain('data-embed-provider="tiktok"')
      expect(result).toContain('data-embed-title="Midnight pasta #pasta"')
      expect(result).not.toContain('<blockquote')
      expect(result).not.toContain('<p>Midnight pasta')
    })
  })
})
// One block per shape the corpus survey found, so a shape nobody handles is visible here as
// a missing block. Each asserts the whole placeholder, since the point is that every shape
// maps to the same fields and not merely that it is recognised.
describeForEachParser('tiktok variants', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  const fullClip = {
    provider: 'tiktok',
    id: videoId,
    src: `https://www.tiktok.com/embed/v2/${videoId}`,
    url: `https://www.tiktok.com/@user/video/${videoId}`,
    title: 'caption text #tag',
    author: '@user',
  }

  describe('canonical oEmbed blockquote with the loader script', () => {
    const value = html`
      <blockquote
        class="tiktok-embed"
        cite="https://www.tiktok.com/@user/video/7000000000000000000"
        data-video-id="7000000000000000000"
        data-embed-from="oembed"
        style="max-width:605px; min-width:325px;"
      >
        <section>
          <a target="_blank" title="@user" href="https://www.tiktok.com/@user?refer=embed">@user</a>
          <p>caption text <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a></p>
          <a href="https://www.tiktok.com/music/x-700001?refer=embed">&#9836; original sound</a>
        </section>
      </blockquote>
      <script async src="https://www.tiktok.com/embed.js"></script>
    `

    it('should carry every field across', async () => {
      expect(await placeholder(value)).toEqual(fullClip)
    })

    it('should leave no loader script behind', async () => {
      expect(await convert(value)).not.toContain('embed.js')
    })
  })

  describe('WordPress Gutenberg figure wrapper', () => {
    // The theme, news-engine and Ghost wrappers are the same shape with another class, so the
    // selector keys on the blockquote and they cost nothing.
    const value = html`
      <figure class="wp-block-embed is-type-video is-provider-tiktok wp-block-embed-tiktok">
        <div class="wp-block-embed__wrapper">
          <blockquote
            class="tiktok-embed"
            cite="https://www.tiktok.com/@user/video/7000000000000000000"
            data-video-id="7000000000000000000"
          >
            <section>
              <a target="_blank" href="https://www.tiktok.com/@user?refer=embed">@user</a>
              <p>caption text <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a></p>
            </section>
          </blockquote>
        </div>
      </figure>
    `

    it('should carry every field across through the wrapper', async () => {
      expect(await placeholder(value)).toEqual(fullClip)
    })
  })

  describe('non-canonical attribute order, class last and no style', () => {
    const value = html`
      <blockquote
        cite="https://www.tiktok.com/@user/video/7000000000000000000"
        data-video-id="7000000000000000000"
        class="tiktok-embed"
      >
        <section>
          <a target="_blank" href="https://www.tiktok.com/@user?refer=embed">@user</a>
          <p>caption text <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a></p>
        </section>
      </blockquote>
    `

    it('should match on the class token rather than a position', async () => {
      expect(await placeholder(value)).toEqual(fullClip)
    })
  })

  describe('post-hydration iframe inside the surviving blockquote', () => {
    // No other shape declares a height, so without this a vertical clip is drawn as a
    // video-shaped box. The hydrated iframe rendered at this height against the blockquote's
    // own max-width, so the pair is a real measurement rather than a guess. The text is gone,
    // replaced by the frame, so there is no caption or author left to take.
    const value = html`
      <blockquote
        id="v25421583374779120"
        class="tiktok-embed"
        cite="https://www.tiktok.com/@user/video/7000000000000000000"
        data-video-id="7000000000000000000"
        style="max-width: 605px;min-width: 325px"
      >
        <p>
          <iframe
            name="__tt_embed__v25421583374779120"
            src="https://www.tiktok.com/embed/v2/7000000000000000000?lang=es-ES"
            style="width: 100%;height: 758px;max-height: 758px"
          ></iframe>
        </p>
      </blockquote>
    `

    it('should carry the rendered size and claim no text it does not have', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'tiktok',
        id: videoId,
        src: `https://www.tiktok.com/embed/v2/${videoId}`,
        url: `https://www.tiktok.com/@user/video/${videoId}`,
        width: '605',
        height: '758',
      })
    })
  })

  describe('creator-profile embed, no video', () => {
    // It carries no data-video-id at all, so a selector keyed on one silently misses it.
    const value = html`
      <blockquote
        class="tiktok-embed"
        cite="https://www.tiktok.com/@user"
        data-unique-id="user"
        data-embed-from="oembed"
        data-embed-type="creator"
        style="max-width:780px; min-width:288px;"
      >
        <section>
          <a target="_blank" href="https://www.tiktok.com/@user?refer=creator_embed">@user</a>
        </section>
      </blockquote>
    `

    it('should carry every field across, pointing at the profile viewer', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
      })
    })
  })

  describe('a creator blockquote whose data-unique-id is not a handle', () => {
    // The handle is interpolated into the viewer url, so anything outside TikTok's own
    // character set is refused. The profile anchor still names the account, so it wins.
    const value = html`
      <blockquote
        class="tiktok-embed"
        cite="https://www.tiktok.com/@user"
        data-unique-id="../evil"
        data-embed-type="creator"
      >
        <section><a href="https://www.tiktok.com/@user">@user</a></section>
      </blockquote>
    `

    it('should ignore the attribute and take the handle from the anchor', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
      })
    })
  })

  describe('a blockquote naming no account anywhere', () => {
    // A hashtag is not an account and there is no clip either, so nothing can be minted and
    // the text stays as it is.
    const value = html`
      <blockquote class="tiktok-embed">
        <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a> orphaned caption
      </blockquote>
    `

    it('should be left alone', async () => {
      const result = await convert(value)

      expect(result).not.toContain('data-embed-provider')
      expect(result).toContain('orphaned caption')
    })
  })

  describe('fully entity-encoded blockquote', () => {
    // The decoding happens upstream, so by the time the widget pass runs this is the canonical
    // blockquote again.
    const value =
      '&lt;blockquote cite=&quot;https://www.tiktok.com/@user/video/7000000000000000000&quot; class=&quot;tiktok-embed&quot; data-video-id=&quot;7000000000000000000&quot;&gt; &lt;section&gt; &lt;a href=&quot;https://www.tiktok.com/@user&quot;&gt;@user&lt;/a&gt; &lt;p&gt;caption text &lt;a href=&quot;https://www.tiktok.com/tag/tag&quot;&gt;#tag&lt;/a&gt;&lt;/p&gt; &lt;/section&gt; &lt;/blockquote&gt;'

    it('should carry every field across once decoded', async () => {
      expect(await placeholder(value)).toEqual(fullClip)
    })
  })

  describe('half entity-encoded blockquote, the minimal authored shape', () => {
    // No video id, no cite, no /video/ link: the account is the only thing this markup still
    // identifies, so it resolves to the profile viewer rather than being left as text.
    const value =
      '&lt;blockquote class="tiktok-embed" style="max-width: 605px;"&gt; &lt;a target="_blank" href="https://www.tiktok.com/@user?refer=embed"&gt;@user&lt;/a&gt; caption text &lt;/blockquote&gt;'

    it('should carry every field across, the caption included', async () => {
      expect(await placeholder(value)).toEqual({
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
        title: 'caption text',
      })
    })
  })
})
