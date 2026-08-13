import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractOmnyClip, omnyResolveEmbed } from './omny.js'

describe('extractOmnyClip', () => {
  it('should read a clip', () => {
    const value = 'https://omny.fm/shows/the-show/an-episode-title/embed?style=cover'

    expect(extractOmnyClip(value)).toBe('the-show/an-episode-title')
  })

  it('should read a playlist', () => {
    const value = 'https://omny.fm/shows/the-show/playlists/highlights/embed'

    expect(extractOmnyClip(value)).toBe('the-show/playlists/highlights')
  })

  it('should return undefined for a show page that is not an embed', () => {
    const value = 'https://omny.fm/shows/the-show'

    expect(extractOmnyClip(value)).toBeUndefined()
  })

  it('should return undefined when no clip is named', () => {
    const value = 'https://omny.fm/shows/embed'

    expect(extractOmnyClip(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractOmnyClip(value)).toBeUndefined()
  })
})

describe('omnyResolveEmbed', () => {
  // style= and size= change the player's shape, so the publisher's query survives the rewrite.
  it('should state the player height and keep the display options', () => {
    const value = 'https://omny.fm/shows/the-show/an-episode/embed?media=audio&style=cover'
    const expected: EmbedResolverResult = {
      provider: 'omny',
      id: 'the-show/an-episode',
      src: 'https://omny.fm/shows/the-show/an-episode/embed?media=audio&style=cover',
      height: 180,
    }

    expect(omnyResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a omny url naming no clip', () => {
    const value = 'https://omny.fm/about'

    expect(omnyResolveEmbed(value)).toBeUndefined()
  })
})
