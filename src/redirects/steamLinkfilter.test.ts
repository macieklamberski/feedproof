import { describe, expect, it } from 'bun:test'
import { extractSteamLinkfilter } from './steamLinkfilter.js'

describe('extractSteamLinkfilter', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://steamcommunity.com/linkfilter/?url=https%3A%2F%2Fexample.com%2Farticle',
    )

    expect(extractSteamLinkfilter(url)).toBe('https://example.com/article')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://steamcommunity.com/linkfilter/?other=value')

    expect(extractSteamLinkfilter(url)).toBeUndefined()
  })

  it('should return null for non-linkfilter Steam paths', () => {
    const url = new URL('https://steamcommunity.com/profile?url=https%3A%2F%2Fexample.com')

    expect(extractSteamLinkfilter(url)).toBeUndefined()
  })

  it('should return null for non-Steam hosts', () => {
    const url = new URL('https://example.com/linkfilter/?url=https%3A%2F%2Fother.com')

    expect(extractSteamLinkfilter(url)).toBeUndefined()
  })
})
