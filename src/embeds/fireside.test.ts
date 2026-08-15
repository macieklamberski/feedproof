import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractFiresideToken, firesideResolveEmbed } from './fireside.js'

describe('extractFiresideToken', () => {
  it('should read the show and episode token', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected = 'DiNRb69N+Dagp3z15'

    expect(extractFiresideToken(value)).toBe(expected)
  })

  it('should read a token whose plus arrived percent-encoded', () => {
    const value = 'https://fireside.fm/player/v2/o5sVQfzy%2BKzqauAdJ'
    const expected = 'o5sVQfzy+KzqauAdJ'

    expect(extractFiresideToken(value)).toBe(expected)
  })

  it('should return undefined for a fireside url that is not a player', () => {
    const value = 'https://fireside.fm/podcasts'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a token of the wrong shape', () => {
    const value = 'https://fireside.fm/player/v2/onlyoneside'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractFiresideToken(value)).toBeUndefined()
  })
})

describe('firesideResolveEmbed', () => {
  // Sampled at 200 in 28 of 28 corpus iframes, which is the whole reason this resolver exists.
  it('should state the fixed player height', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'DiNRb69N+Dagp3z15',
      src: 'https://player.fireside.fm/v2/DiNRb69N+Dagp3z15',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a fireside url naming no episode', () => {
    const value = 'https://fireside.fm/pricing'

    expect(firesideResolveEmbed(value)).toBeUndefined()
  })
})
