import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../tests.js'
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
    expect(extractBandcampRelease('https://bandcamp.com/EmbeddedPlayer/track=42/size=small/')).toBe(
      'track/42',
    )
  })

  // The video player spells its options as a query string instead.
  it('should read a track from the video query', () => {
    const value = 'https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff&linkcol=7137dc'

    expect(extractBandcampRelease(value)).toBe('track/1959185434')
  })

  it('should return undefined when no release is named', () => {
    expect(
      extractBandcampRelease('https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/'),
    ).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    expect(extractBandcampRelease('https://bandcamp.com/VideoEmbed?track=abc')).toBeUndefined()
  })
})

describeForEachParser('bandcampEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(bandcampEmbedResolver.selector)

    return element ? (bandcampEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

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
    it('should read the canonical url and title from the fallback anchor', () => {
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

      expect(extract(value)).toMatchObject({
        provider: 'bandcamp',
        id: 'album/3373381116',
        src: 'https://bandcamp.com/EmbeddedPlayer/album=3373381116/size=large/',
        height: 470,
        url: 'http://myexpansiveawareness.bandcamp.com/album/do-you-wanna-be-rich',
        title: 'Do You Wanna Be Rich? by My Expansive Awareness',
      })
    })

    it('should keep the video player form for a video embed', () => {
      const value =
        '<iframe src="https://bandcamp.com/VideoEmbed?track=1959185434&bgcol=ffffff"></iframe>'

      expect(extract(value)).toMatchObject({
        id: 'track/1959185434',
        src: 'https://bandcamp.com/VideoEmbed?track=1959185434',
      })
    })

    it('should yield provider and id when no fallback anchor exists', () => {
      const value =
        '<iframe src="https://bandcamp.com/EmbeddedPlayer/album=42/size=small/"></iframe>'
      const result = extract(value)

      expect(result).toMatchObject({ provider: 'bandcamp', id: 'album/42', height: 42 })
      expect(result?.url).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should ignore a player naming no release', () => {
      expect(
        extract(
          '<iframe src="https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=ffffff/"></iframe>',
        ),
      ).toBeUndefined()
    })

    it('should ignore a carrier pointing somewhere else', () => {
      expect(
        extract('<iframe src="https://example.com/EmbeddedPlayer/album=42/"></iframe>'),
      ).toBeUndefined()
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
