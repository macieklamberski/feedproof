import { describe, expect, it } from 'bun:test'
import { anchorResolveEmbed, extractAnchorEpisode } from './anchor.js'

describe('extractAnchorEpisode', () => {
  it('should read the original anchor.fm form', () => {
    expect(extractAnchorEpisode('https://anchor.fm/myshow/embed/episodes/my-title-e123')).toBe(
      'myshow/my-title-e123',
    )
  })

  it('should read the podcasters.spotify.com form', () => {
    const value = 'https://podcasters.spotify.com/pod/show/myshow/embed/episodes/my-title-e123'

    expect(extractAnchorEpisode(value)).toBe('myshow/my-title-e123')
  })

  it('should read the creators.spotify.com form', () => {
    const value = 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc'

    expect(extractAnchorEpisode(value)).toBe('me/my-title-e1')
  })

  it('should return undefined for a show page rather than an embed', () => {
    expect(extractAnchorEpisode('https://anchor.fm/myshow')).toBeUndefined()
  })
})

describe('anchorResolveEmbed', () => {
  it('should size the legacy players at their own height', () => {
    expect(anchorResolveEmbed('https://anchor.fm/myshow/embed/episodes/my-title-e123')).toEqual({
      provider: 'anchor',
      id: 'myshow/my-title-e123',
      src: 'https://anchor.fm/myshow/embed/episodes/my-title-e123',
      height: 102,
    })
  })

  // The newest generation renders taller, so the two are not averaged.
  it('should size the creators player taller', () => {
    const value = 'https://creators.spotify.com/pod/profile/me/embed/episodes/my-title-e1/a-abc'

    expect(anchorResolveEmbed(value)).toMatchObject({ height: 204 })
  })
})
