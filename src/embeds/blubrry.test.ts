import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { blubrryResolveEmbed, extractBlubrryEmbed } from './blubrry.js'

describe('extractBlubrryEmbed', () => {
  it('should read an episode id', () => {
    const value = 'https://player.blubrry.com/id/12345678/'
    const expected = '12345678'

    expect(extractBlubrryEmbed(value)).toBe(expected)
  })

  it('should read a media url', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'
    const expected = 'https://media.blubrry.com/show/ep.mp3'

    expect(extractBlubrryEmbed(value)).toBe(expected)
  })

  it('should return undefined for a blubrry url naming nothing', () => {
    const value = 'https://blubrry.com/pricing'

    expect(extractBlubrryEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractBlubrryEmbed(value)).toBeUndefined()
  })
})

describe('blubrryResolveEmbed', () => {
  it('should state the player height for an episode id', () => {
    const value = 'https://player.blubrry.com/id/12345678/'
    const expected: EmbedResolverResult = {
      provider: 'blubrry',
      id: '12345678',
      src: 'https://player.blubrry.com/id/12345678/',
      height: 138,
    }

    expect(blubrryResolveEmbed(value)).toEqual(expected)
  })

  // The raw file stays inside the player url: form fidelity keeps a provider's player an embed.
  it('should keep a media url as a player rather than a native audio element', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'
    const expected: EmbedResolverResult = {
      provider: 'blubrry',
      id: 'https://media.blubrry.com/show/ep.mp3',
      src: 'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3',
      height: 138,
    }

    expect(blubrryResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a blubrry url naming no episode', () => {
    const value = 'https://blubrry.com/about'

    expect(blubrryResolveEmbed(value)).toBeUndefined()
  })
})
