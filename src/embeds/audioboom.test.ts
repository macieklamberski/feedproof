import { describe, expect, it } from 'bun:test'
import { audioboomResolveEmbed, extractAudioboomPost } from './audioboom.js'

describe('extractAudioboomPost', () => {
  it('should read the current player', () => {
    expect(extractAudioboomPost('https://embeds.audioboom.com/posts/8292430/embed/v4')).toEqual({
      id: '8292430',
      isCurrent: true,
    })
  })

  it('should read the compact player', () => {
    expect(extractAudioboomPost('https://embeds.audioboom.com/posts/8292430/embed')).toMatchObject({
      isCurrent: false,
    })
  })

  it('should read the pre-rename boos spelling', () => {
    expect(extractAudioboomPost('https://audioboo.fm/boos/123456/embed')).toMatchObject({
      id: '123456',
    })
  })

  it('should return undefined for an audioboom url naming no post', () => {
    expect(extractAudioboomPost('https://audioboom.com/channels/something')).toBeUndefined()
  })
})

describe('audioboomResolveEmbed', () => {
  // The url names the player version and the version decides the height.
  it('should size the current player at its own height', () => {
    expect(audioboomResolveEmbed('https://embeds.audioboom.com/posts/8292430/embed/v4')).toEqual({
      provider: 'audioboom',
      id: '8292430',
      src: 'https://embeds.audioboom.com/posts/8292430/embed/v4',
      height: 300,
    })
  })

  it('should size the compact player shorter', () => {
    expect(audioboomResolveEmbed('https://embeds.audioboom.com/posts/8292430/embed')).toMatchObject(
      {
        height: 95,
      },
    )
  })
})
