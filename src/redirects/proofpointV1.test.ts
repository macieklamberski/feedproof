import { describe, expect, it } from 'bun:test'
import { extractProofpointV1 } from './proofpointV1.js'

describe('extractProofpointV1', () => {
  it('should decode a v1 URL with substituted slashes', () => {
    const url = new URL(
      'https://urldefense.proofpoint.com/v1/url?u=https://example.com_path_to_article&k=key',
    )

    expect(extractProofpointV1(url)).toBe('https://example.com/path/to/article')
  })

  it('should decode percent-encoded characters from `-` substitution', () => {
    const url = new URL(
      'https://urldefense.proofpoint.com/v1/url?u=https://example.com_search-3Fq-3Dhello',
    )

    expect(extractProofpointV1(url)).toBe('https://example.com/search?q=hello')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://urldefense.proofpoint.com/v1/url?k=key')

    expect(extractProofpointV1(url)).toBeUndefined()
  })

  it('should return null for non-v1 paths', () => {
    const url = new URL('https://urldefense.proofpoint.com/v2/url?u=https://example.com_path')

    expect(extractProofpointV1(url)).toBeUndefined()
  })

  it('should return null for non-Proofpoint hosts', () => {
    const url = new URL('https://example.com/v1/url?u=https://other.com_path')

    expect(extractProofpointV1(url)).toBeUndefined()
  })

  it('should return null when decoded URL has malformed percent escapes', () => {
    // `-Z` becomes `%Z` after substitution, which decodeURIComponent rejects.
    const url = new URL('https://urldefense.proofpoint.com/v1/url?u=https-Zbroken')

    expect(extractProofpointV1(url)).toBeUndefined()
  })
})
