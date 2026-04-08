import { describe, expect, it } from 'bun:test'
import { spotifyEmbedDomains } from './spotify.js'

describe('spotifyEmbedDomains', () => {
  it('should include open.spotify.com', () => {
    expect(spotifyEmbedDomains).toContain('open.spotify.com')
  })
})
