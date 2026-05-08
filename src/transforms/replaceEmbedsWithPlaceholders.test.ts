import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import { youtubeEmbedHandler } from '../embeds/youtube.js'
import type { EmbedHandler, TransformContext } from '../types.js'
import { replaceEmbedsWithPlaceholders } from './replaceEmbedsWithPlaceholders.js'

const stubHandler: EmbedHandler = {
  selector: 'iframe[src*="example.com"]',
  extract: (element) => ({
    provider: 'example',
    src: element.getAttribute('src') ?? '',
    type: 'iframe',
  }),
}

const withHandlers: TransformContext = {
  embedHandlers: [youtubeEmbedHandler, stubHandler],
}

const withNoHandlers: TransformContext = {
  embedHandlers: [],
}

describe('replaceEmbedsWithPlaceholders', () => {
  it('should replace iframe with rich-metadata placeholder when handler returns metadata', () => {
    const value = '<p>Text</p><iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-src="https://www.youtube-nocookie.com/embed/abc123"')
    expect(result).toContain('data-embed-url="https://www.youtube.com/watch?v=abc123"')
    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/abc123/maxresdefault.jpg"',
    )
    expect(result).not.toContain('<iframe')
  })

  it('should include fallback link with canonical url', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('<a href="https://www.youtube.com/watch?v=abc123">')
    expect(result).toContain('https://www.youtube.com/watch?v=abc123</a>')
  })

  it('should preserve iframe dimensions as data attributes', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/abc123" width="640" height="360"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should replace multiple embeds in same content', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/abc123"></iframe><iframe src="https://example.com/player/xyz"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-provider="example"')
  })

  it('should preserve surrounding content when replacing media', () => {
    const value =
      '<p>Before</p><iframe src="https://www.youtube.com/embed/abc123"></iframe><p>After</p>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('data-embed="iframe"')
  })

  it('should emit data-embed-author and data-embed-text when handler returns them', () => {
    const customHandler: EmbedHandler = {
      selector: 'blockquote.tweet',
      extract: () => ({
        provider: 'twitter',
        src: 'https://platform.twitter.com/embed/Tweet.html?id=1',
        url: 'https://twitter.com/user/status/1',
        author: '@user',
        text: 'Hello world',
        type: 'iframe',
      }),
    }
    const value = '<blockquote class="tweet">Tweet text</blockquote>'
    const result = transformHtml(
      value,
      replaceEmbedsWithPlaceholders({ embedHandlers: [customHandler] }),
    )

    expect(result).toContain('data-embed-author="@user"')
    expect(result).toContain('data-embed-text="Hello world"')
  })

  it('should leave iframe untouched when no handler claims it', () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('<iframe')
    expect(result).not.toContain('data-embed')
  })

  it('should skip iframe without src attribute', () => {
    const value = '<iframe></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).not.toContain('data-embed')
  })

  it('should do nothing when embedHandlers is empty', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withNoHandlers))

    expect(result).toContain('<iframe')
    expect(result).not.toContain('data-embed')
  })

  it('should leave video elements untouched', () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('<video')
    expect(result).not.toContain('data-embed')
  })

  it('should leave audio elements untouched', () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('<audio')
    expect(result).not.toContain('data-embed')
  })

  it('should handle iframe with malformed src url gracefully', () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).not.toContain('data-embed')
  })

  it('should fall through to next handler when first returns undefined', () => {
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withHandlers))

    expect(result).toContain('data-embed-provider="example"')
  })

  it('should use defaultEmbedHandlers when context omits embedHandlers', () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders({}))

    expect(result).toContain('data-embed-provider="youtube"')
  })
})
