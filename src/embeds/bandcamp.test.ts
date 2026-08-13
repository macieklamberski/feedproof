import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, resolverExtractor } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { bandcampEmbedResolver, extractBandcampRelease } from './bandcamp.js'

describe('extractBandcampRelease', () => {
  it('should read an album from the player path', () => {
    const value =
      'https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/bgcol=ffffff/transparent=true/'

    expect(extractBandcampRelease(value)).toBe('album/3373381116')
  })

  it('should read a track from the player path', () => {
    const value = 'https://bandcamp.com/EmbeddedPlayer/track=42/size=small/'

    expect(extractBandcampRelease(value)).toBe('track/42')
  })

  // The video player spells its options as a query string instead.
  it('should read a track from the video query', () => {
    const value = 'https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff&linkcol=7137dc'

    expect(extractBandcampRelease(value)).toBe('track/1959185434')
  })

  it('should return undefined when no release is named', () => {
    const value = 'https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/'

    expect(extractBandcampRelease(value)).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    const value = 'https://bandcamp.com/VideoEmbed?track=abc'

    expect(extractBandcampRelease(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractBandcampRelease(value)).toBeUndefined()
  })
})

describeForEachParser('bandcampEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bandcampEmbedResolver)

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({
        ...baseContext,
        widgetResolvers: [bandcampEmbedResolver],
      } as TransformContext),
    ])
  }

  describe('happy paths', () => {
    // Bandcamp's own snippet carries the release page and label in a fallback anchor, which is
    // the only place either appears — the player url names the release by number alone.
    it('should read the canonical url and title from the fallback anchor', async () => {
      const value = html`
        <iframe
          src="https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/bgcol=ffffff/transparent=true/"
          seamless
        >
          <a href="http://myexpansiveawareness.bandcamp.com/album/do-you-wanna-be-rich">
            Do You Wanna Be Rich? by My Expansive Awareness
          </a>
        </iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/3373381116',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/',
        url: 'http://myexpansiveawareness.bandcamp.com/album/do-you-wanna-be-rich',
        height: 470,
        title: 'Do You Wanna Be Rich? by My Expansive Awareness',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the video player form for a video embed', async () => {
      const value =
        '<iframe src="https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'track/1959185434',
        src: 'https://bandcamp.com/VideoEmbed?track=1959185434',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should yield provider and id when no fallback anchor exists', async () => {
      const value =
        '<iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=small/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'bandcamp',
        id: 'album/42',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=42/size=small/',
        height: 42,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a player naming no release', async () => {
      const value =
        '<iframe src="https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a carrier pointing somewhere else', async () => {
      const value = '<iframe src="https://example.com/EmbeddedPlayer/album=42/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  it('should replace the iframe with the placeholder', async () => {
    const value =
      '<iframe src="https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/" width="350" height="470"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="bandcamp"')
    expect(result).toContain('data-embed-id="album/3373381116"')
    expect(result).toContain('data-embed-height="470"')
    expect(result).not.toContain('<iframe')
  })
})
