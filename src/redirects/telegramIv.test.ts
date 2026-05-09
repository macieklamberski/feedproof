import { describe, expect, it } from 'bun:test'
import { extractTelegramIv } from './telegramIv.js'

describe('extractTelegramIv', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://t.me/iv?url=https%3A%2F%2Fexample.com%2Farticle&rhash=abc123',
    )

    expect(extractTelegramIv(url)).toBe('https://example.com/article')
  })

  it('should return null for non-iv Telegram paths', () => {
    const url = new URL('https://t.me/channelname')

    expect(extractTelegramIv(url)).toBeNull()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://t.me/iv?rhash=abc123')

    expect(extractTelegramIv(url)).toBeNull()
  })

  it('should return null for non-Telegram hosts', () => {
    const url = new URL('https://example.com/iv?url=https%3A%2F%2Fother.com')

    expect(extractTelegramIv(url)).toBeNull()
  })
})
