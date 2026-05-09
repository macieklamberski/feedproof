import { describe, expect, it } from 'bun:test'
import { extractGitee } from './gitee.js'

describe('extractGitee', () => {
  it('should extract target from target param', () => {
    const url = new URL('https://gitee.com/link?target=https%3A%2F%2Fexample.com%2Frepo')

    expect(extractGitee(url)).toBe('https://example.com/repo')
  })

  it('should return null when target param is missing', () => {
    const url = new URL('https://gitee.com/link?other=value')

    expect(extractGitee(url)).toBeUndefined()
  })

  it('should return null for non-link Gitee paths', () => {
    const url = new URL('https://gitee.com/explore?target=https%3A%2F%2Fexample.com')

    expect(extractGitee(url)).toBeUndefined()
  })

  it('should return null for non-Gitee hosts', () => {
    const url = new URL('https://example.com/link?target=https%3A%2F%2Fother.com')

    expect(extractGitee(url)).toBeUndefined()
  })
})
