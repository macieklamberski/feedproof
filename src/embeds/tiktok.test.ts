import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { tiktokEmbedResolver } from './tiktok.js'

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
