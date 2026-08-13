import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractIvooxEpisode, ivooxResolveEmbed } from './ivoox.js'

describe('extractIvooxEpisode', () => {
  it('should read an episode from the current player', () => {
    const value = 'https://www.ivoox.com/player_ej_80807760_6_1.html'
    const expected = { id: '80807760', skin: '6' }

    expect(extractIvooxEpisode(value)).toEqual(expected)
  })

  it('should read an episode from the legacy player', () => {
    const value = 'http://www.ivoox.com/playerivoox_ee_8292430_1.html'
    const expected = { id: '8292430', skin: '1' }

    expect(extractIvooxEpisode(value)).toEqual(expected)
  })

  it('should read the regional player host', () => {
    const value = 'https://ar.ivoox.com/es/player_ej_45987110_2_1.html?data=abc'
    const expected = { id: '45987110', skin: '2' }

    expect(extractIvooxEpisode(value)).toEqual(expected)
  })

  it('should return undefined for an ivoox url that is not a player', () => {
    const value = 'https://www.ivoox.com/podcast-something_sq_f1_1.html'

    expect(extractIvooxEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractIvooxEpisode(value)).toBeUndefined()
  })
})

describe('ivooxResolveEmbed', () => {
  // The legacy player 404s while the same id in the current form serves, so this is a repair.
  it('should rewrite the dead legacy player to the current one', () => {
    const value = 'http://www.ivoox.com/playerivoox_ee_8292430_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '8292430',
      src: 'https://www.ivoox.com/player_ej_8292430_1_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should carry the skin the source states', () => {
    const value = 'https://www.ivoox.com/player_ej_80807760_6_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '80807760',
      src: 'https://www.ivoox.com/player_ej_80807760_6_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a ivoox url naming no episode', () => {
    const value = 'https://www.ivoox.com/index.html'

    expect(ivooxResolveEmbed(value)).toBeUndefined()
  })
})
