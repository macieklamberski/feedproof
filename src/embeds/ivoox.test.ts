import { describe, expect, it } from 'bun:test'
import { extractIvooxEpisode, ivooxResolveEmbed } from './ivoox.js'

describe('extractIvooxEpisode', () => {
  it('should read an episode from the current player', () => {
    expect(extractIvooxEpisode('https://www.ivoox.com/player_ej_80807760_6_1.html')).toEqual({
      id: '80807760',
      skin: '6',
    })
  })

  it('should read an episode from the legacy player', () => {
    expect(extractIvooxEpisode('http://www.ivoox.com/playerivoox_ee_8292430_1.html')).toEqual({
      id: '8292430',
      skin: '1',
    })
  })

  it('should read the regional player host', () => {
    const value = 'https://ar.ivoox.com/es/player_ej_45987110_2_1.html?data=abc'

    expect(extractIvooxEpisode(value)).toMatchObject({ id: '45987110', skin: '2' })
  })

  it('should return undefined for an ivoox url that is not a player', () => {
    expect(
      extractIvooxEpisode('https://www.ivoox.com/podcast-something_sq_f1_1.html'),
    ).toBeUndefined()
  })
})

describe('ivooxResolveEmbed', () => {
  // The legacy player 404s while the same id in the current form serves, so this is a repair.
  it('should rewrite the dead legacy player to the current one', () => {
    expect(ivooxResolveEmbed('http://www.ivoox.com/playerivoox_ee_8292430_1.html')).toEqual({
      provider: 'ivoox',
      id: '8292430',
      src: 'https://www.ivoox.com/player_ej_8292430_1_1.html',
      height: 200,
    })
  })

  it('should carry the skin the source states', () => {
    expect(ivooxResolveEmbed('https://www.ivoox.com/player_ej_80807760_6_1.html')).toMatchObject({
      src: 'https://www.ivoox.com/player_ej_80807760_6_1.html',
    })
  })
})
