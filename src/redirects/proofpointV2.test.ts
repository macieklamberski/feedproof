import { describe, expect, it } from 'bun:test'
import { extractProofpointV2 } from './proofpointV2.js'

describe('extractProofpointV2', () => {
  it('should decode a v2 URL with substituted slashes', () => {
    const url = new URL(
      'https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com_article&d=DwMFAg&c=abc',
    )

    expect(extractProofpointV2(url)).toBe('https://example.com/article')
  })

  it('should decode complex percent-encoded query strings', () => {
    const url = new URL(
      'https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com_path-3Fq-3Dhello-26lang-3Den',
    )

    expect(extractProofpointV2(url)).toBe('https://example.com/path?q=hello&lang=en')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://urldefense.proofpoint.com/v2/url?d=DwMFAg')

    expect(extractProofpointV2(url)).toBeNull()
  })

  it('should return null for non-v2 paths', () => {
    const url = new URL('https://urldefense.proofpoint.com/v1/url?u=https-3A__example.com_path')

    expect(extractProofpointV2(url)).toBeNull()
  })

  it('should return null for non-Proofpoint hosts', () => {
    const url = new URL('https://example.com/v2/url?u=https-3A__other.com_path')

    expect(extractProofpointV2(url)).toBeNull()
  })
})
