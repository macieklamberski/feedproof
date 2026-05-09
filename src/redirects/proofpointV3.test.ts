import { describe, expect, it } from 'bun:test'
import { extractProofpointV3 } from './proofpointV3.js'

describe('extractProofpointV3', () => {
  it('should return the URL as-is when there is no replacement segment', () => {
    const url = new URL('https://urldefense.com/v3/__https://www.example.com/article__;!!abc!def$')

    expect(extractProofpointV3(url)).toBe('https://www.example.com/article')
  })

  it('should restore single `*` markers using base64 replacements', () => {
    // Replacement b64 'Iw' decodes to '#'.
    const url = new URL('https://urldefense.com/v3/__http://www.example.com/*test__;Iw!!abc!def$')

    expect(extractProofpointV3(url)).toBe('http://www.example.com/#test')
  })

  it('should restore `**X` runs using the byte count map', () => {
    // Replacement b64 'IyMjIyM' decodes to '#####' (5 chars). `**D` = 5 bytes.
    const url = new URL(
      'https://urldefense.com/v3/__http://www.example.com/**Dtest__;IyMjIyM!!abc!def$',
    )

    expect(extractProofpointV3(url)).toBe('http://www.example.com/#####test')
  })

  it('should accept the proofpoint.com host alias', () => {
    const url = new URL(
      'https://urldefense.proofpoint.com/v3/__https://www.example.com/article__;!!abc!def$',
    )

    expect(extractProofpointV3(url)).toBe('https://www.example.com/article')
  })

  it('should preserve query strings inside the mangled URL', () => {
    const url = new URL(
      'https://urldefense.com/v3/__https://www.example.com/path?q=hello__;!!abc!def$',
    )

    expect(extractProofpointV3(url)).toBe('https://www.example.com/path?q=hello')
  })

  it('should return null for non-v3 paths', () => {
    const url = new URL('https://urldefense.com/v2/url?u=https-3A__example.com_path')

    expect(extractProofpointV3(url)).toBeNull()
  })

  it('should return null for non-Proofpoint hosts', () => {
    const url = new URL('https://example.com/v3/__https://other.com__;!!abc!def$')

    expect(extractProofpointV3(url)).toBeNull()
  })
})
