import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { tiktokEmbedResolver } from './tiktok.js'

// One test per shape the corpus survey found, so a shape nobody handles is visible here as a
// missing test. Each asserts the whole result, since the point is that every shape maps to the
// same fields and not merely that it is recognised.
describeForEachParser('tiktokEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tiktokEmbedResolver)

  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  describe('happy paths', () => {
    it('should resolve the canonical oembed blockquote', async () => {
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
        description: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match a sanitized copy with the class after other attributes', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        description: 'Midnight pasta',
        author: '@cookingwithlynja',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The theme, news-engine and Ghost wrappers are the same shape with another class, so the
    // selector keys on the blockquote and they cost nothing.
    it('should resolve the blockquote inside a block editor wrapper', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        description: 'caption text #tag',
        author: '@user',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should still mint the player from the id when the cite is only the bare host', async () => {
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
        description: 'Midnight pasta',
        author: '@cookingwithlynja',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the caption and author from the paragraph-wrapped shape', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        description: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // No other shape declares a height, so without this a vertical clip is drawn as a
    // video-shaped box. The hydrated iframe rendered at this height against the blockquote's
    // own max-width, so the pair is a real measurement rather than a guess. The text is gone,
    // replaced by the frame, so there is no caption or author left to take.
    it('should keep the size the hydrated player rendered at', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        width: 605,
        height: 758,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The creator widget names an account and no clip at all, so a selector keyed on a video
    // id silently misses it.
    it('should resolve the creator widget to the profile viewer', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The minimal authored shape, stripped of every data attribute and of the cite: no video id,
    // no cite, no /video/ link. The account is the only thing this markup still identifies, so it
    // resolves to the profile viewer rather than being left as text.
    it('should resolve a stripped blockquote to the account its anchor names', async () => {
      const value = html`
        <blockquote class="tiktok-embed" style="max-width: 605px;">
          <a target="_blank" href="https://www.tiktok.com/@user?refer=embed">@user</a> caption text
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
        description: 'caption text',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the video id is empty and no account is named', async () => {
      const value =
        '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/7001234567890123456" data-video-id=""></blockquote>'

      expect(await extract(value)).toBeUndefined()
    })

    // A hashtag is not an account and there is no clip either, so nothing can be minted.
    it('should return undefined for a blockquote naming no account anywhere', async () => {
      const value = html`
        <blockquote class="tiktok-embed">
          <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a> orphaned caption
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The handle is interpolated into the viewer url, so anything outside TikTok's own
    // character set is refused. The profile anchor still names the account, so it wins.
    it('should ignore a data-unique-id that is not a handle and read the anchor', async () => {
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
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user',
        src: 'https://www.tiktok.com/embed/@user',
        url: 'https://www.tiktok.com/@user',
        author: '@user',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should omit the url for a cite on a foreign host', async () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://example.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section><p>Midnight pasta</p></section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        description: 'Midnight pasta',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should omit the description when the caption paragraph is empty', async () => {
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

      expect(await extract(value)).toEqual(expected)
    })

    it('should omit the author when the first section anchor is not a handle', async () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <a href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Artist</a>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // What only the whole pipeline shows: the snippet arrives as a blockquote plus a loader
  // script, and a feed may deliver the pair entity-encoded. Neither is visible to the resolver
  // on its own, so both are asserted on the finished document.
  describe('through the pipeline', () => {
    it('should leave the placeholder and no loader script behind', async () => {
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
        <script
          async
          src="https://www.tiktok.com/embed.js"
        ></script>
      `
      const expected = html`
        <div
          data-embed-provider="tiktok"
          data-embed-id="7000000000000000000"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-description="caption text #tag"
          data-embed-author="@user"
        >
          <a href="https://www.tiktok.com/@user/video/7000000000000000000">https://www.tiktok.com/@user/video/7000000000000000000</a>
        </div>
      `

      expect(await convert(value)).toEqualHtml(expected)
    })

    // The decoding happens upstream, so by the time the widget pass runs this is the canonical
    // blockquote again.
    it('should resolve a snippet the feed delivered entity-encoded', async () => {
      const value =
        '&lt;blockquote cite=&quot;https://www.tiktok.com/@user/video/7000000000000000000&quot; class=&quot;tiktok-embed&quot; data-video-id=&quot;7000000000000000000&quot;&gt; &lt;section&gt; &lt;a href=&quot;https://www.tiktok.com/@user&quot;&gt;@user&lt;/a&gt; &lt;p&gt;caption text &lt;a href=&quot;https://www.tiktok.com/tag/tag&quot;&gt;#tag&lt;/a&gt;&lt;/p&gt; &lt;/section&gt; &lt;/blockquote&gt;'
      const expected = html`
        <div
          data-embed-provider="tiktok"
          data-embed-id="7000000000000000000"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-description="caption text #tag"
          data-embed-author="@user"
        >
          <a href="https://www.tiktok.com/@user/video/7000000000000000000">https://www.tiktok.com/@user/video/7000000000000000000</a>
        </div>
      `

      expect(await convert(value)).toEqualHtml(expected)
    })
  })
})
