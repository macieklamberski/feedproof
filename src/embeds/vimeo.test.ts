import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractVimeoId, vimeoEmbedResolver, vimeoResolveEmbed } from './vimeo.js'

// Every url spelling that names a single video. All extract the same id, so a deleted row is a
// format that silently lost support.
const videoUrls = [
  'https://vimeo.com/76979871',
  'https://player.vimeo.com/video/76979871',
  'https://vimeo.com/channels/staffpicks/76979871',
  'https://vimeo.com/groups/motion/videos/76979871',
  // The Flash player carried no id in the path at all, and shipped its options beside it.
  'http://vimeo.com/moogaloop.swf?clip_id=76979871',
  'http://vimeo.com/moogaloop.swf?clip_id=76979871&force_embed=1&server=vimeo.com&color=00adef',
]

describe('extractVimeoId', () => {
  it.each(videoUrls)('should extract the id from %s', (value) => {
    expect(extractVimeoId(value)).toBe('76979871')
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
    const value = 'https://vimeo.com/76979871'
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871',
      url: 'https://vimeo.com/76979871',
    }

    expect(vimeoResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve an unlisted hash', () => {
    const value = 'https://player.vimeo.com/video/76979871?h=abc123'
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871?h=abc123',
      url: 'https://vimeo.com/76979871',
    }

    expect(vimeoResolveEmbed(value)).toEqual(expected)
  })

  it('should preserve the start offset', () => {
    const value = 'https://player.vimeo.com/video/76979871?t=30s'
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871?t=30s',
      url: 'https://vimeo.com/76979871',
    }

    expect(vimeoResolveEmbed(value)).toEqual(expected)
  })

  it('should drop tracking parameters', () => {
    const value = 'https://player.vimeo.com/video/76979871?utm_source=feed'
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871',
      url: 'https://vimeo.com/76979871',
    }

    expect(vimeoResolveEmbed(value)).toEqual(expected)
  })
})

describeForEachParser('vimeoEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, vimeoEmbedResolver)

  it('should resolve a vimeo iframe', async () => {
    const value = '<iframe src="https://player.vimeo.com/video/76979871"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      id: '76979871',
      src: 'https://player.vimeo.com/video/76979871',
      url: 'https://vimeo.com/76979871',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a non-vimeo iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await extract(value)).toBeUndefined()
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

      expect(await extract(value)).toEqual(expected)
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

      expect(await extract(value)).toEqual(expected)
    })
  })
})
