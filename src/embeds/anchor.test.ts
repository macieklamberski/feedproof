import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { anchorResolveEmbed, extractAnchorEpisode } from './anchor.js'

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
