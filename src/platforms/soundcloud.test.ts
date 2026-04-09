import { describe, expect, it } from 'bun:test'
import { soundcloudEmbedDomains } from './soundcloud.js'

describe('soundcloudEmbedDomains', () => {
  it('should include w.soundcloud.com', () => {
    expect(soundcloudEmbedDomains).toContain('w.soundcloud.com')
  })
})
