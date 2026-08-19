import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { audioboomResolveEmbed, extractAudioboomPost } from './audioboom.js'

describe('extractAudioboomPost', () => {
  it('should read the current player', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed/v4'
    const expected = { id: '8292430', isCurrent: true }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should read the compact player', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed'
    const expected = { id: '8292430', isCurrent: false }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should read the pre-rename boos spelling', () => {
    const value = 'https://audioboo.fm/boos/123456/embed'
    const expected = { id: '123456', isCurrent: false }

    expect(extractAudioboomPost(value)).toEqual(expected)
  })

  it('should return undefined for an audioboom url naming no post', () => {
    const value = 'https://audioboom.com/channels/something'

    expect(extractAudioboomPost(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractAudioboomPost(value)).toBeUndefined()
  })
})

describe('audioboomResolveEmbed', () => {
  // The url names the player version and the version decides the height.
  it('should size the current player at its own height', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed/v4'
    const expected: EmbedResolverResult = {
      provider: 'audioboom',
      id: '8292430',
      src: 'https://embeds.audioboom.com/posts/8292430/embed/v4',
      height: 300,
    }

    expect(audioboomResolveEmbed(value)).toEqual(expected)
  })

  it('should size the compact player shorter', () => {
    const value = 'https://embeds.audioboom.com/posts/8292430/embed'
    const expected: EmbedResolverResult = {
      provider: 'audioboom',
      id: '8292430',
      src: 'https://embeds.audioboom.com/posts/8292430/embed',
      height: 95,
    }

    expect(audioboomResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a audioboom url naming no post', () => {
    const value = 'https://audioboom.com/about'

    expect(audioboomResolveEmbed(value)).toBeUndefined()
  })
})
