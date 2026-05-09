import { describe, expect, it } from 'bun:test'
import { extractSegmentfault } from './segmentfault.js'

describe('extractSegmentfault', () => {
  it('should decode a base64 enc param', () => {
    const target = 'https://example.com/article'
    const encoded = Buffer.from(target).toString('base64')
    const url = new URL(`https://link.segmentfault.com/?enc=${encodeURIComponent(encoded)}`)

    expect(extractSegmentfault(url)).toBe(target)
  })

  it('should return null when the decoded value is not http(s)', () => {
    const encoded = Buffer.from('not-a-url').toString('base64')
    const url = new URL(`https://link.segmentfault.com/?enc=${encodeURIComponent(encoded)}`)

    expect(extractSegmentfault(url)).toBeNull()
  })

  it('should return null when enc param is missing', () => {
    const url = new URL('https://link.segmentfault.com/?other=value')

    expect(extractSegmentfault(url)).toBeNull()
  })

  it('should return null for non-Segmentfault hosts', () => {
    const url = new URL('https://example.com/?enc=abc')

    expect(extractSegmentfault(url)).toBeNull()
  })
})
