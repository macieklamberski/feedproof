import { describe, expect, it } from 'bun:test'
import { extractSlack } from './slack.js'

describe('extractSlack', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://slack-redir.net/link?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractSlack(url)).toBe('https://example.com/article')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://slack-redir.net/link?other=value')

    expect(extractSlack(url)).toBeNull()
  })

  it('should return null for non-link Slack paths', () => {
    const url = new URL('https://slack-redir.net/redirect?url=https%3A%2F%2Fexample.com')

    expect(extractSlack(url)).toBeNull()
  })

  it('should return null for non-Slack hosts', () => {
    const url = new URL('https://example.com/link?url=https%3A%2F%2Fother.com')

    expect(extractSlack(url)).toBeNull()
  })
})
