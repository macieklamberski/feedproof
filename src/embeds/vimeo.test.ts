import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractVimeoId, vimeoEmbedResolver, vimeoResolveEmbed } from './vimeo.js'

describe('extractVimeoId', () => {
  it('should extract id from a vimeo.com url', () => {
    const value = 'https://vimeo.com/76979871'
    const expected = '76979871'

    expect(extractVimeoId(value)).toBe(expected)
  })

  it('should extract id from a player embed url', () => {
    const value = 'https://player.vimeo.com/video/76979871'
    const expected = '76979871'

    expect(extractVimeoId(value)).toBe(expected)
  })

  it('should extract id from a channel url', () => {
    const value = 'https://vimeo.com/channels/staffpicks/76979871'
    const expected = '76979871'

    expect(extractVimeoId(value)).toBe(expected)
  })

  // The Flash player carried no id in the path at all.
  it('should extract id from the moogaloop.swf url', () => {
    const value = 'http://vimeo.com/moogaloop.swf?clip_id=43301601'
    const expected = '43301601'

    expect(extractVimeoId(value)).toBe(expected)
  })

  it('should extract id from a moogaloop.swf url carrying player options', () => {
    const value =
      'http://vimeo.com/moogaloop.swf?clip_id=43301601&force_embed=1&server=vimeo.com&color=00adef'
    const expected = '43301601'

    expect(extractVimeoId(value)).toBe(expected)
  })

  it('should return undefined for a moogaloop.swf url with no clip id', () => {
    const value = 'http://vimeo.com/moogaloop.swf?server=vimeo.com'

    expect(extractVimeoId(value)).toBeUndefined()
  })

  // A showcase is a playlist and an event is a livestream, both in their own id space, so the
  // numeric segment would name an unrelated video.
  it('should return undefined for a showcase url', () => {
    const value = 'https://vimeo.com/showcase/7060635'

    expect(extractVimeoId(value)).toBeUndefined()
  })

  it('should return undefined for an event url', () => {
    const value = 'https://player.vimeo.com/event/1234567'

    expect(extractVimeoId(value)).toBeUndefined()
  })

  it('should return undefined when there is no numeric id', () => {
    const value = 'https://vimeo.com/user/profile'

    expect(extractVimeoId(value)).toBeUndefined()
  })
})

describe('vimeoResolveEmbed', () => {
  it('should build the embed without a thumbnail', () => {
    const result = vimeoResolveEmbed('https://vimeo.com/76979871')
    const expected = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871',
      url: 'https://vimeo.com/76979871',
    }

    expect(result).toEqual(expected)
    expect(result?.thumbnail).toBeUndefined()
  })

  it('should preserve an unlisted hash', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?h=abc123')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871?h=abc123')
  })

  it('should preserve the start offset', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?t=30s')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871?t=30s')
  })

  it('should drop tracking parameters', () => {
    const result = vimeoResolveEmbed('https://player.vimeo.com/video/76979871?utm_source=feed')

    expect(result?.src).toBe('https://player.vimeo.com/video/76979871')
  })
})

describeForEachParser('vimeoEmbedResolver', (parseHtml) => {
  const resolve = resolverExtractor(parseHtml, vimeoEmbedResolver)

  it('should resolve a vimeo iframe', async () => {
    const result = await resolve('<iframe src="https://player.vimeo.com/video/76979871"></iframe>')

    expect(result?.provider).toBe('vimeo')
    expect(result?.id).toBe('76979871')
  })

  it('should ignore a non-vimeo iframe', async () => {
    const result = await resolve('<iframe src="https://example.com/video"></iframe>')

    expect(result).toBeUndefined()
  })

  describe('the title the share snippet writes', () => {
    it('should carry the video title across', async () => {
      const value = html`
        <iframe
          src="https://player.vimeo.com/video/76979871"
          width="640"
          height="360"
          title="Scott M. Graffius - Speaker Reel"
          frameborder="0"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'vimeo',
        id: '76979871',
        src: 'https://player.vimeo.com/video/76979871',
        url: 'https://vimeo.com/76979871',
        title: 'Scott M. Graffius - Speaker Reel',
        width: 640,
        height: 360,
      }

      expect(await resolve(value)).toEqual(expected)
    })

    // The label is carried like any other stated title. Half of them are the real thing and the
    // labels are localised into at least five languages, so filtering would be a list that ages.
    it('should carry a player label as stated rather than judging it', async () => {
      const value = html`
        <iframe
          src="https://player.vimeo.com/video/76979871"
          title="Vimeo video player"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'vimeo',
        id: '76979871',
        src: 'https://player.vimeo.com/video/76979871',
        url: 'https://vimeo.com/76979871',
        title: 'Vimeo video player',
      }

      expect(await resolve(value)).toEqual(expected)
    })

    it('should state no title when the attribute holds only whitespace', async () => {
      const value = html`
        <iframe src="https://player.vimeo.com/video/76979871" title="   "></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'vimeo',
        id: '76979871',
        src: 'https://player.vimeo.com/video/76979871',
        url: 'https://vimeo.com/76979871',
      }

      expect(await resolve(value)).toEqual(expected)
    })
  })
})
