import { describe, expect, it } from 'bun:test'
import { extractSpreakerEmbed, spreakerResolveEmbed } from './spreaker.js'

describe('extractSpreakerEmbed', () => {
  it('should read an episode player', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark&playlist=false'

    expect(extractSpreakerEmbed(value)).toEqual({
      kind: 'episode',
      param: 'episode_id',
      id: '52842990',
    })
  })

  it('should read a show player', () => {
    expect(extractSpreakerEmbed('https://widget.spreaker.com/player?show_id=1234567')).toEqual({
      kind: 'show',
      param: 'show_id',
      id: '1234567',
    })
  })

  it('should return undefined when the player names nothing', () => {
    expect(extractSpreakerEmbed('https://widget.spreaker.com/player?theme=dark')).toBeUndefined()
  })

  it('should return undefined for a spreaker url that is not a player', () => {
    expect(extractSpreakerEmbed('https://www.spreaker.com/show/some-show')).toBeUndefined()
  })
})

describe('spreakerResolveEmbed', () => {
  // The corpus iframes carry no height at all, so stating Spreaker's documented 200 is what a
  // reader gains beyond the provider label.
  it('should state the documented player height', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark'

    expect(spreakerResolveEmbed(value)).toEqual({
      provider: 'spreaker',
      id: 'episode/52842990',
      src: 'https://widget.spreaker.com/player?episode_id=52842990',
      height: 200,
    })
  })

  it('should return undefined for a spreaker url naming no episode', () => {
    expect(spreakerResolveEmbed('https://widget.spreaker.com/player?x=1')).toBeUndefined()
  })
})
