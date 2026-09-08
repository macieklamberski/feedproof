import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { anchorEmbedResolver, anchorResolveEmbed, extractAnchorEpisode } from './anchor.js'

describe('extractAnchorEpisode', () => {
  it('should read the original anchor.fm form', () => {
    const value = 'https://anchor.fm/myshow/embed/episodes/my-title-e123'
    const expected = 'myshow/my-title-e123'

    expect(extractAnchorEpisode(value)).toBe(expected)
  })

  it('should read the podcasters.spotify.com form', () => {
    const value = 'https://podcasters.spotify.com/pod/show/myshow/embed/episodes/my-title-e123'
    const expected = 'myshow/my-title-e123'

    expect(extractAnchorEpisode(value)).toBe(expected)
  })

  it('should read the creators.spotify.com form', () => {
    const value = 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc'
    const expected = 'me/my-title-e1'

    expect(extractAnchorEpisode(value)).toBe(expected)
  })

  it('should return undefined for a show page rather than an embed', () => {
    const value = 'https://anchor.fm/myshow'

    expect(extractAnchorEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractAnchorEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a anchor url naming no episode', () => {
    const value = 'https://anchor.fm/pricing'

    expect(extractAnchorEpisode(value)).toBeUndefined()
  })

  // The marker is present but the episode segment is not, which is a different guard from a
  // url that never mentions `embed/episodes` at all.
  it('should return undefined when the embed marker names no episode', () => {
    const value = 'https://anchor.fm/myshow/embed/episodes'

    expect(extractAnchorEpisode(value)).toBeUndefined()
  })
})

describe('anchorResolveEmbed', () => {
  it('should state the player height', () => {
    const value = 'https://anchor.fm/myshow/embed/episodes/my-title-e123'
    const expected: EmbedResolverResult = {
      provider: 'anchor',
      id: 'myshow/my-title-e123',
      src: 'https://anchor.fm/myshow/embed/episodes/my-title-e123',
      height: 100,
    }

    expect(anchorResolveEmbed(value)).toEqual(expected)
  })

  // The three hosts redirect to one player, so the newest generation gets the same height.
  it('should state the same height for the creators host', () => {
    const value = 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc'
    const expected: EmbedResolverResult = {
      provider: 'anchor',
      id: 'me/my-title-e1',
      src: 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc',
      height: 100,
    }

    expect(anchorResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a anchor url naming no episode', () => {
    const value = 'https://anchor.fm/pricing'

    expect(anchorResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('anchorEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, anchorEmbedResolver)

  describe('happy paths', () => {
    it('should state the player height for a carrier declaring none', async () => {
      const value = html`
        <iframe
          src="https://anchor.fm/myshow/embed/episodes/my-title-e123"
          frameborder="0"
          scrolling="no"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'anchor',
        id: 'myshow/my-title-e123',
        src: 'https://anchor.fm/myshow/embed/episodes/my-title-e123',
        height: 100,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The height the publisher pasted is the one their player was measured against, so the
    // 102 Spotify's own snippet writes stands over the resolver's 100.
    it('should keep the size the carrier declares', async () => {
      const value = html`
        <iframe
          src="https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc"
          width="400"
          height="102"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'anchor',
        id: 'me/my-title-e1',
        src: 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc',
        width: 400,
        height: 102,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = html`
        <iframe src="https://evil.test/anchor.fm/myshow/embed/episodes/my-title-e123"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an anchor url naming no episode', async () => {
      const value = '<iframe src="https://anchor.fm/pricing"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
