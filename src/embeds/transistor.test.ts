import { describe, expect, it } from 'bun:test'
import { extractTransistorEmbed, transistorResolveEmbed } from './transistor.js'

describe('extractTransistorEmbed', () => {
  it('should read an episode embed', () => {
    expect(extractTransistorEmbed('https://share.transistor.fm/e/a1b2c3d4')).toEqual({
      kind: 'e',
      id: 'a1b2c3d4',
    })
  })

  it('should read an episode embed carrying display options', () => {
    expect(extractTransistorEmbed('https://share.transistor.fm/e/a1b2c3d4/dark')).toMatchObject({
      id: 'a1b2c3d4',
    })
  })

  it('should read a show playlist', () => {
    expect(extractTransistorEmbed('https://share.transistor.fm/s/9f8e7d6c')).toMatchObject({
      kind: 's',
    })
  })

  it('should return undefined for a transistor url naming nothing', () => {
    expect(extractTransistorEmbed('https://share.transistor.fm/pricing')).toBeUndefined()
  })
})

describe('transistorResolveEmbed', () => {
  // 180 across 49 of 49 sampled corpus iframes, and their oEmbed agrees.
  it('should size an episode at the fixed height', () => {
    expect(transistorResolveEmbed('https://share.transistor.fm/e/a1b2c3d4/dark')).toEqual({
      provider: 'transistor',
      id: 'episode/a1b2c3d4',
      src: 'https://share.transistor.fm/e/a1b2c3d4',
      height: 180,
    })
  })

  it('should size a show playlist taller', () => {
    expect(transistorResolveEmbed('https://share.transistor.fm/s/9f8e7d6c')).toMatchObject({
      id: 'show/9f8e7d6c',
      height: 390,
    })
  })
})
