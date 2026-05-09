import { describe, expect, it } from 'bun:test'
import { extractYouTubeRedirect } from './youtubeRedirect.js'

describe('extractYouTubeRedirect', () => {
  it('should extract target from q param', () => {
    const url = new URL(
      'https://www.youtube.com/redirect?event=video_description&redir_token=abc&q=https%3A%2F%2Fexample.com%2Fstory',
    )

    expect(extractYouTubeRedirect(url)).toBe('https://example.com/story')
  })

  it('should return null when q param is missing', () => {
    const url = new URL('https://www.youtube.com/redirect?event=video_description')

    expect(extractYouTubeRedirect(url)).toBeNull()
  })

  it('should return null for non-redirect YouTube paths', () => {
    const url = new URL('https://www.youtube.com/watch?q=https%3A%2F%2Fexample.com')

    expect(extractYouTubeRedirect(url)).toBeNull()
  })

  it('should return null for non-YouTube hosts', () => {
    const url = new URL('https://example.com/redirect?q=https%3A%2F%2Fother.com')

    expect(extractYouTubeRedirect(url)).toBeNull()
  })
})
