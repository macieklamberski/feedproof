import { describe, expect, it } from 'bun:test'
import { vimeoEmbedDomains } from './vimeo.js'

describe('vimeoEmbedDomains', () => {
  it('should include player.vimeo.com', () => {
    expect(vimeoEmbedDomains).toContain('player.vimeo.com')
  })
})
