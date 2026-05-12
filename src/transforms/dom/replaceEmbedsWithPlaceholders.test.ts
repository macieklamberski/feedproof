import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import type { EmbedResolver, TransformContext } from '../../types.js'
import { replaceEmbedsWithPlaceholders } from './replaceEmbedsWithPlaceholders.js'

const stubResolver: EmbedResolver = {
  selector: 'iframe[src*="example.com"]',
  extract: (element) => ({
    provider: 'example',
    src: element.getAttribute('src') ?? '',
    type: 'iframe',
  }),
}

const baseContext: TransformContext = {
  embedResolvers: [],
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

const withResolvers: TransformContext = {
  ...baseContext,
  embedResolvers: [youtubeEmbedResolver, stubResolver],
}

const withNoResolvers: TransformContext = {
  ...baseContext,
  embedResolvers: [],
}

describe('replaceEmbedsWithPlaceholders', () => {
  it('should replace iframe with rich-metadata placeholder when handler returns metadata', () => {
    const value = '<p>Text</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"',
    )
    expect(result).not.toContain('<iframe')
  })

  it('should include fallback link with canonical url', () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">')
    expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>')
  })

  it('should preserve iframe dimensions as data attributes', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should replace multiple embeds in same content', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><iframe src="https://example.com/player/xyz"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-provider="example"')
  })

  it('should preserve surrounding content when replacing media', () => {
    const value =
      '<p>Before</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><p>After</p>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('data-embed="iframe"')
  })

  it('should emit data-embed-author and data-embed-text when handler returns them', () => {
    const customResolver: EmbedResolver = {
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
      replaceEmbedsWithPlaceholders({ ...baseContext, embedResolvers: [customResolver] }),
    )

    expect(result).toContain('data-embed-author="@user"')
    expect(result).toContain('data-embed-text="Hello world"')
  })

  it('should wrap unknown iframe as generic placeholder without provider', () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-src="https://unknown-site.com/123"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should preserve dimensions when wrapping unknown iframe', () => {
    const value = '<iframe src="https://unknown-site.com/123" width="640" height="360"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should include fallback link when wrapping unknown iframe', () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain(
      '<a href="https://unknown-site.com/123">https://unknown-site.com/123</a>',
    )
  })

  it('should skip iframe without src attribute', () => {
    const value = '<iframe></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should still wrap unknown iframes when embedResolvers is empty', () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withNoResolvers))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should leave video elements untouched', () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('<video')
    expect(result).not.toContain('data-embed')
  })

  it('should leave audio elements untouched', () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('<audio')
    expect(result).not.toContain('data-embed')
  })

  it('should skip iframe with malformed src url', () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should skip iframe with non-http(s) src', () => {
    const value = '<iframe src="javascript:alert(1)"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).not.toContain('data-embed')
  })

  it('should fall through to next handler when first returns undefined', () => {
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withResolvers))

    expect(result).toContain('data-embed-provider="example"')
  })

  it('should resolve YouTube via defaultEmbedResolvers export', () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = transformHtml(
      value,
      replaceEmbedsWithPlaceholders({ ...baseContext, embedResolvers: defaultEmbedResolvers }),
    )

    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should still wrap iframes when embedResolvers is empty', () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = transformHtml(value, replaceEmbedsWithPlaceholders(withNoResolvers))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should skip resolver-claimed iframe when metadata.src is unsafe', () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'javascript:alert(1)',
        type: 'iframe',
      }),
    }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = transformHtml(
      value,
      replaceEmbedsWithPlaceholders({ ...baseContext, embedResolvers: [unsafeResolver] }),
    )

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should skip resolver-claimed iframe when metadata.url is unsafe', () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'https://example.com/x',
        url: 'javascript:alert(1)',
        type: 'iframe',
      }),
    }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = transformHtml(
      value,
      replaceEmbedsWithPlaceholders({ ...baseContext, embedResolvers: [unsafeResolver] }),
    )

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should let consumer override resolveUrlFn to allow non-default schemes', () => {
    const value = '<iframe src="custom-scheme://payload"></iframe>'
    const result = transformHtml(
      value,
      replaceEmbedsWithPlaceholders({
        ...baseContext,
        embedResolvers: [],
        resolveUrlFn: (url) => url,
      }),
    )

    expect(result).toContain('data-embed-src="custom-scheme://payload"')
  })
})
