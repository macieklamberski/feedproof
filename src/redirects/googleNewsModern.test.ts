import { describe, expect, it } from 'bun:test'
import { extractGoogleNewsModern } from './googleNewsModern.js'

const buildArticleId = (sourceUrl: string): string => {
  const urlBytes = Buffer.from(sourceUrl, 'utf8')
  const payload = Buffer.concat([
    Buffer.from([0x08, 0x13, 0x22, urlBytes.length]),
    urlBytes,
    Buffer.from([0xd2, 0x01, 0x00]),
  ])
  return payload.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('extractGoogleNewsModern', () => {
  it('should decode target from /articles/<base64> path', () => {
    const id = buildArticleId('https://example.com/article')
    const url = new URL(`https://news.google.com/articles/${id}`)

    expect(extractGoogleNewsModern(url)).toBe('https://example.com/article')
  })

  it('should decode target from /rss/articles/<base64> path', () => {
    const id = buildArticleId('https://example.com/article')
    const url = new URL(`https://news.google.com/rss/articles/${id}`)

    expect(extractGoogleNewsModern(url)).toBe('https://example.com/article')
  })

  it('should return null when the id lacks framing bytes', () => {
    const id = Buffer.from('hello world', 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const url = new URL(`https://news.google.com/articles/${id}`)

    expect(extractGoogleNewsModern(url)).toBeNull()
  })

  it('should return null for non-articles paths', () => {
    const url = new URL('https://news.google.com/foryou')

    expect(extractGoogleNewsModern(url)).toBeNull()
  })

  it('should return null for non-Google-News hosts', () => {
    const id = buildArticleId('https://example.com/article')
    const url = new URL(`https://example.com/articles/${id}`)

    expect(extractGoogleNewsModern(url)).toBeNull()
  })

  it('should return null for malformed base64 ids', () => {
    const url = new URL('https://news.google.com/articles/not-valid-base64')

    expect(extractGoogleNewsModern(url)).toBeNull()
  })
})
