import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { tiktokBlockquoteEmbedResolver, tiktokIframeEmbedResolver } from './tiktok.js'

// One test per shape the corpus survey found, so a shape nobody handles is visible here as a
// missing test. Each asserts the whole result, since the point is that every shape maps to the
// same fields and not merely that it is recognised.
describeForEachParser('tiktokBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tiktokBlockquoteEmbedResolver)

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
            <p>Midnight pasta <a title="#pasta" target="_blank" href="https://www.tiktok.com/tag/pasta">#pasta</a>
            </p>
            <a target="_blank" title="original sound" href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Lynja</a>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@cookingwithlynja/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        description: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
        height: 738,
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
        id: '@cookingwithlynja/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        description: 'Midnight pasta',
        author: '@cookingwithlynja',
        height: 738,
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
                <p>caption text <a href="https://www.tiktok.com/tag/tag?refer=embed">#tag</a>
                </p>
              </section>
            </blockquote>
          </div>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        description: 'caption text #tag',
        author: '@user',
        height: 738,
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
        id: '@cookingwithlynja/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        description: 'Midnight pasta',
        author: '@cookingwithlynja',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A sanitizer that empties the attribute leaves the cite intact, so the clip is still
    // named and the id chain recovers it there.
    it('should recover the clip from the cite when the video id attribute is empty', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@user/video/7001234567890123456"
          data-video-id=""
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the caption and author from the paragraph-wrapped shape', async () => {
      // The shape the default pipeline hands to convertWidgets: earlier transforms have
      // wrapped the section's bare author and sound anchors into paragraphs of their own.
      const value = html`
        <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <p>
              <a href="https://www.tiktok.com/@cookingwithlynja">@cookingwithlynja</a>
            </p>
            <p>Midnight pasta <a href="https://www.tiktok.com/tag/pasta">#pasta</a>
            </p>
            <p>
              <a href="https://www.tiktok.com/music/original-sound-7001234567890123456">♬ original sound - Lynja</a>
            </p>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@cookingwithlynja/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@cookingwithlynja/video/7001234567890123456',
        description: 'Midnight pasta #pasta',
        author: '@cookingwithlynja',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The other shapes state the player's fixed height. The hydrated iframe rendered at this
    // height against the blockquote's own max-width, so the pair is a real measurement of this
    // clip and wins over it. The text is gone, replaced by the frame, so there is no caption or
    // author left to take.
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
        id: '@user/video/7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        width: 605,
        height: 758,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The style is read with parsePixelSize, which bounds a declared pixel size to 10..9999 and
    // rejects a fraction. A hydrated height of `758.53px` is not a measurement a reader can put
    // in a width/height attribute, and a `1px` or `99999px` box is not one the player rendered.
    it('should ignore a hydrated size outside the pixel bounds', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@user/video/7000000000000000000"
          data-video-id="7000000000000000000"
          style="max-width: 605px;"
        >
          <p>
            <iframe
              src="https://www.tiktok.com/embed/v2/7000000000000000000"
              style="width: 100%;height: 758.53px"
            ></iframe>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        height: 738,
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
    it('should return undefined when the video id is empty and no clip or account is named', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/"
          data-video-id=""
        ></blockquote>
      `

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
    // The attribute and the cite are both gone, so the caption's own watch anchor is the last
    // source in the id chain that still names the clip.
    it('should recover the clip from a watch anchor when the attribute and cite are stripped', async () => {
      const value = html`
        <blockquote class="tiktok-embed">
          <section>
            <a href="https://www.tiktok.com/@user/video/7001234567890123456">Watch on TikTok</a>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The video id is interpolated into the player url, so anything non-numeric is refused,
    // and the cite still names the clip.
    it('should ignore a data-video-id that is not numeric and read the cite', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@user/video/7001234567890123456"
          data-video-id="../evil"
        ></blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

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
          <section>
            <a href="https://www.tiktok.com/@user">@user</a>
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

    // A foreign cite names neither the url nor a handle, and nothing else in the markup does
    // either, so the id stays the bare video id: the player is still mintable, only the
    // enrichment key is out of reach.
    it('should fall back to the bare video id for a cite on a foreign host', async () => {
      const value = html`
        <blockquote class="tiktok-embed" cite="https://example.com/@user/video/7001234567890123456" data-video-id="7001234567890123456">
          <section>
            <p>Midnight pasta</p>
          </section>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        description: 'Midnight pasta',
        height: 738,
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
        id: '@user/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
        author: '@user',
        height: 738,
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
        id: '@user/video/7001234567890123456',
        src: 'https://www.tiktok.com/embed/v2/7001234567890123456',
        url: 'https://www.tiktok.com/@user/video/7001234567890123456',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The measurement must not depend on which player url the CMS stored, so the hydrated
    // iframe is matched by the same paths the direct carrier resolver claims.
    it('should keep the hydrated measurement when the stored iframe uses the first-generation path', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@user/video/7000000000000000000"
          data-video-id="7000000000000000000"
          style="max-width: 605px;"
        >
          <p>
            <iframe
              src="https://www.tiktok.com/embed/7000000000000000000"
              style="width: 100%;height: 758px"
            ></iframe>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7000000000000000000',
        src: 'https://www.tiktok.com/embed/v2/7000000000000000000',
        url: 'https://www.tiktok.com/@user/video/7000000000000000000',
        width: 605,
        height: 758,
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
          data-embed-id="@user/video/7000000000000000000"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-description="caption text #tag"
          data-embed-author="@user"
          data-embed-height="738"
        ></div>
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
          data-embed-id="@user/video/7000000000000000000"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-description="caption text #tag"
          data-embed-author="@user"
          data-embed-height="738"
        ></div>
      `

      expect(await convert(value)).toEqualHtml(expected)
    })

    // A hydrated blockquote carries the player iframe inside it, which the url-keyed resolver
    // would also claim, so the pass must leave one placeholder and not two.
    it('should leave one placeholder for a hydrated blockquote and its inner player', async () => {
      const value = html`
        <blockquote
          class="tiktok-embed"
          cite="https://www.tiktok.com/@user/video/7000000000000000000"
          data-video-id="7000000000000000000"
          style="max-width: 605px;"
        >
          <p>
            <iframe
              src="https://www.tiktok.com/embed/v2/7000000000000000000?lang=es-ES"
              style="width: 100%;height: 758px"
            ></iframe>
          </p>
        </blockquote>
      `
      const expected = html`
        <div
          data-embed-provider="tiktok"
          data-embed-id="@user/video/7000000000000000000"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-width="605"
          data-embed-height="758"
        ></div>
      `

      expect(await convert(value)).toEqualHtml(expected)
    })
  })
})

// The player iframe pasted directly, with no blockquote around it: 62 corpus feeds carry the
// embed paths and 5 the player path, 40 of them with no blockquote fallback at all.
describeForEachParser('tiktokIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, tiktokIframeEmbedResolver)

  describe('happy paths', () => {
    // The declared 560x400 is the snippet's landscape box on a vertical player, wrong on both
    // axes, so the player's own height stands in its place.
    it('should resolve the pasted v2 player and decline its landscape size', async () => {
      const value = html`
        <iframe
          src="https://www.tiktok.com/embed/v2/7520573541146692886"
          width="560"
          height="400"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7520573541146692886',
        src: 'https://www.tiktok.com/embed/v2/7520573541146692886',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the first-generation embed path', async () => {
      const value = '<iframe src="https://www.tiktok.com/embed/7520573541146692886"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7520573541146692886',
        src: 'https://www.tiktok.com/embed/7520573541146692886',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the player url with the query the publisher chose', async () => {
      const value = html`
        <iframe
          src="https://www.tiktok.com/player/v1/7520573541146692886?music_info=1&description=1"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7520573541146692886',
        src: 'https://www.tiktok.com/player/v1/7520573541146692886?music_info=1&description=1',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the watch page a wrapper frames instead of the player', () => {
    // This was pinned as a non-resolution, on the grounds that the watch page refuses framing.
    // It does, which is why it is claimed now: unclaimed it becomes a placeholder pointing at a
    // page that renders nothing, and the path names the clip well enough to mint the player.
    it('should mint the player from a framed watch page', async () => {
      const value = html`
        <iframe src="https://www.tiktok.com/@user/video/7520573541146692886"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '@user/video/7520573541146692886',
        src: 'https://www.tiktok.com/embed/v2/7520573541146692886',
        url: 'https://www.tiktok.com/@user/video/7520573541146692886',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A sanitizer that drops the handle leaves the bare `/video/{id}` half, which still names
    // the clip. With no handle to carry, the id is the same bare video id the player carrier
    // states for the same clip.
    it('should mint the player from a handle-less watch page', async () => {
      const value = html`
        <iframe src="https://www.tiktok.com/video/7520573541146692886"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'tiktok',
        id: '7520573541146692886',
        src: 'https://www.tiktok.com/embed/v2/7520573541146692886',
        url: 'https://www.tiktok.com/video/7520573541146692886',
        height: 738,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The host is TikTok's and the resolver now reads more than the player path, so every
    // shape that is not a clip has to be refused by name rather than by the host gate.
    it('should return undefined for a profile page framed directly', async () => {
      const value = html`<iframe src="https://www.tiktok.com/@user"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a hashtag page', async () => {
      const value = html`<iframe src="https://www.tiktok.com/tag/dance"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a search page', async () => {
      const value = html`<iframe src="https://www.tiktok.com/search?q=dance"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the site root', async () => {
      const value = html`<iframe src="https://www.tiktok.com/"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a foreign host carrying the player path', async () => {
      const value = html`
        <iframe src="https://evil.test/www.tiktok.com/embed/v2/7520573541146692886"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the player path holds no numeric id', async () => {
      const value = '<iframe src="https://www.tiktok.com/embed/v2/latest"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  // An enclosure's size reaches the resolver the same way a carrier's does, so refusing the
  // carrier refuses the feed as well. Before the player stated a height, that left a TikTok
  // enclosure with no size at all.
  describe('an enclosure the feed sizes itself', () => {
    it('should state the player height over the clip dimensions the feed carries', async () => {
      const expected = html`
        <div
          data-enclosure=""
          data-embed-height="738"
          data-embed-url="https://www.tiktok.com/@user/video/7000000000000000000"
          data-embed-id="@user/video/7000000000000000000"
          data-embed-provider="tiktok"
          data-embed-src="https://www.tiktok.com/embed/v2/7000000000000000000"
        ></div>
      `
      const result = await transformContent('', {
        parseHtmlFn: parseHtml,
        enclosures: [
          {
            url: 'https://www.tiktok.com/@user/video/7000000000000000000',
            type: 'video/mp4',
            width: 1080,
            height: 1920,
          },
        ],
      })

      expect(result).toEqualHtml(expected)
    })
  })
})
