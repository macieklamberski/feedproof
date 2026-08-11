import { describe, expect, it } from 'bun:test'
import { blubrryResolveEmbed, extractBlubrryEmbed } from './blubrry.js'

describe('extractBlubrryEmbed', () => {
  it('should read an episode id', () => {
    expect(extractBlubrryEmbed('https://player.blubrry.com/id/12345678/')).toBe('12345678')
  })

  it('should read a media url', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'

    expect(extractBlubrryEmbed(value)).toBe('https://media.blubrry.com/show/ep.mp3')
  })

  it('should return undefined for a blubrry url naming nothing', () => {
    expect(extractBlubrryEmbed('https://blubrry.com/pricing')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractBlubrryEmbed('https://[')).toBeUndefined()
  })
})

describe('blubrryResolveEmbed', () => {
  it('should state the player height for an episode id', () => {
    expect(blubrryResolveEmbed('https://player.blubrry.com/id/12345678/')).toEqual({
      provider: 'blubrry',
      id: '12345678',
      src: 'https://player.blubrry.com/id/12345678/',
      height: 138,
    })
  })

  // The raw file stays inside the player url: form fidelity keeps a vendor player an embed.
  it('should keep a media url as a player rather than a native audio element', () => {
    const value =
      'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3'

    expect(blubrryResolveEmbed(value)).toMatchObject({
      provider: 'blubrry',
      src: 'https://player.blubrry.com/?media_url=https%3A%2F%2Fmedia.blubrry.com%2Fshow%2Fep.mp3',
    })
  })

  it('should return undefined for a blubrry url naming no episode', () => {
    expect(blubrryResolveEmbed('https://blubrry.com/about')).toBeUndefined()
  })
})
