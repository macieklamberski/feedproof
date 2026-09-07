import { describe, expect, it } from 'bun:test'
import { isPlayerJsReady, playerJsPlayRequest, readPixels } from './hints.js'

describe('readPixels', () => {
  it('should keep a positive number', () => {
    expect(readPixels(321)).toBe(321)
    expect(readPixels(687.125)).toBe(687.125)
  })

  it('should drop what is not a rendered height', () => {
    expect(readPixels(0)).toBeUndefined()
    expect(readPixels(null)).toBeUndefined()
    expect(readPixels(undefined)).toBeUndefined()
    expect(readPixels('tall')).toBeUndefined()
  })
})

describe('isPlayerJsReady', () => {
  it('should recognise the ready event the receiver posts', () => {
    const value = JSON.stringify({
      context: 'player.js',
      version: '0.0.11',
      event: 'ready',
      value: { src: 'https://embed.acast.com/show/episode', events: ['ready', 'play'] },
    })

    expect(isPlayerJsReady(value)).toBe(true)
  })

  it('should ignore the other events and anything that is not player.js', () => {
    expect(isPlayerJsReady(JSON.stringify({ context: 'player.js', event: 'play' }))).toBe(false)
    expect(isPlayerJsReady({ context: 'player.js', event: 'ready' })).toBe(false)
    expect(isPlayerJsReady('{"eventName":"postmessage:do:init"}')).toBe(false)
    expect(isPlayerJsReady('not json')).toBe(false)
  })
})

describe('playerJsPlayRequest', () => {
  it('should be the play method as the string the receiver parses', () => {
    expect(JSON.parse(playerJsPlayRequest)).toEqual({
      context: 'player.js',
      version: '0.0.11',
      method: 'play',
    })
  })
})
