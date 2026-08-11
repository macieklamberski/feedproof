import { describe, expect, it } from 'bun:test'
import { extractFiresideToken, firesideResolveEmbed } from './fireside.js'

describe('extractFiresideToken', () => {
  it('should read the show and episode token', () => {
    expect(extractFiresideToken('https://fireside.fm/player/v2/DiNRb69N+Dagp3z15')).toBe(
      'DiNRb69N+Dagp3z15',
    )
  })

  it('should read a token whose plus arrived percent-encoded', () => {
    expect(extractFiresideToken('https://fireside.fm/player/v2/o5sVQfzy%2BKzqauAdJ')).toBe(
      'o5sVQfzy+KzqauAdJ',
    )
  })

  it('should return undefined for a fireside url that is not a player', () => {
    expect(extractFiresideToken('https://fireside.fm/podcasts')).toBeUndefined()
  })

  it('should return undefined for a token of the wrong shape', () => {
    expect(extractFiresideToken('https://fireside.fm/player/v2/onlyoneside')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractFiresideToken('https://[')).toBeUndefined()
  })
})

describe('firesideResolveEmbed', () => {
  // Sampled at 200 in 28 of 28 corpus iframes, which is the whole reason this resolver exists.
  it('should state the fixed player height', () => {
    expect(firesideResolveEmbed('https://fireside.fm/player/v2/DiNRb69N+Dagp3z15')).toEqual({
      provider: 'fireside',
      id: 'DiNRb69N+Dagp3z15',
      src: 'https://player.fireside.fm/v2/DiNRb69N+Dagp3z15',
      height: 200,
    })
  })

  it('should return undefined for a fireside url naming no episode', () => {
    expect(firesideResolveEmbed('https://fireside.fm/pricing')).toBeUndefined()
  })
})
