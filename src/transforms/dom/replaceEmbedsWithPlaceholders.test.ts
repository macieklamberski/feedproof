import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import { parseHtml } from '../../parsers/linkedom.js'
import type { EmbedResolver, TransformContext } from '../../types.js'
import { replaceEmbedsWithPlaceholders } from './replaceEmbedsWithPlaceholders.js'

const stubResolver: EmbedResolver = {
  selector: 'iframe[src*="example.com"]',
  extract: (element) => ({
    provider: 'example',
    src: element.getAttribute('src') ?? '',
  }),
}

const baseContext: TransformContext = {
  embedResolvers: [],
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
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
  const transform = (html: string, context: TransformContext = withResolvers) => {
    return applyDomTransforms(parseHtml(html), [replaceEmbedsWithPlaceholders(context)])
  }

  it('should replace iframe with rich-metadata placeholder when handler returns metadata', async () => {
    const value = '<p>Text</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain('data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"',
    )
    expect(result).not.toContain('<iframe')
  })

  it('should include fallback link with canonical url', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transform(value)

    expect(result).toContain('<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">')
    expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>')
  })

  it('should preserve iframe dimensions as data attributes', async () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should replace multiple embeds in same content', async () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-provider="example"')
  })

  it('should preserve surrounding content when replacing media', async () => {
    const value =
      '<p>Before</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><p>After</p>'
    const result = await transform(value)

    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('data-embed="iframe"')
  })

  it('should emit data-embed-title, description, author, avatar and duration when handler returns them', async () => {
    const customResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        title: 'Sample title',
        description: 'Sample description',
        author: '@user',
        avatar: 'https://example.com/avatar.jpg',
        duration: 125,
      }),
    }
    const customContext: TransformContext = { ...baseContext, embedResolvers: [customResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-title="Sample title"')
    expect(result).toContain('data-embed-description="Sample description"')
    expect(result).toContain('data-embed-author="@user"')
    expect(result).toContain('data-embed-avatar="https://example.com/avatar.jpg"')
    expect(result).toContain('data-embed-duration="125"')
  })

  it('should skip data-embed-avatar when avatar url is unsafe', async () => {
    const customResolver: EmbedResolver = {
      selector: 'iframe[src*="example.com"]',
      extract: (element) => ({
        provider: 'example',
        src: element.getAttribute('src') ?? '',
        avatar: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, embedResolvers: [customResolver] }
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value, customContext)

    expect(result).not.toContain('data-embed-avatar')
    expect(result).not.toContain('javascript:')
  })

  it('should wrap unknown iframe as generic placeholder without provider', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-src="https://unknown-site.com/123"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should preserve dimensions when wrapping unknown iframe', async () => {
    const value = '<iframe src="https://unknown-site.com/123" width="640" height="360"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should include fallback link when wrapping unknown iframe', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value)

    expect(result).toContain(
      '<a href="https://unknown-site.com/123">https://unknown-site.com/123</a>',
    )
  })

  it('should skip iframe without src attribute', async () => {
    const value = '<iframe></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should still wrap unknown iframes when embedResolvers is empty', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value, withNoResolvers)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should leave video elements untouched', async () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain('<video')
    expect(result).not.toContain('data-embed')
  })

  it('should leave audio elements untouched', async () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    const result = await transform(value)

    expect(result).toContain('<audio')
    expect(result).not.toContain('data-embed')
  })

  it('should skip iframe with malformed src url', async () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
    expect(result).toContain('<iframe')
  })

  it('should skip iframe with non-http(s) src', async () => {
    const value = '<iframe src="javascript:alert(1)"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed')
  })

  it('should fall through to next handler when first returns undefined', async () => {
    const value = '<iframe src="https://example.com/player/xyz"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="example"')
  })

  it('should resolve YouTube via defaultEmbedResolvers export', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      embedResolvers: defaultEmbedResolvers,
    }
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should still wrap iframes when embedResolvers is empty', async () => {
    const value = '<iframe src="https://unknown-site.com/123"></iframe>'
    const result = await transform(value, withNoResolvers)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('data-embed-provider')
  })

  it('should skip resolver-claimed iframe when metadata.src is unsafe', async () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, embedResolvers: [unsafeResolver] }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = await transform(value, customContext)

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should skip resolver-claimed iframe when metadata.url is unsafe', async () => {
    const unsafeResolver: EmbedResolver = {
      selector: 'iframe[src]',
      extract: () => ({
        provider: 'evil',
        src: 'https://example.com/x',
        url: 'javascript:alert(1)',
      }),
    }
    const customContext: TransformContext = { ...baseContext, embedResolvers: [unsafeResolver] }
    const value = '<iframe src="https://example.com/x"></iframe>'
    const result = await transform(value, customContext)

    expect(result).not.toContain('data-embed-provider="evil"')
    expect(result).not.toContain('javascript:')
  })

  it('should let consumer override resolveUrlFn to allow non-default schemes', async () => {
    const customContext: TransformContext = {
      ...baseContext,
      embedResolvers: [],
      resolveUrlFn: (url) => url,
    }
    const value = '<iframe src="custom-scheme://payload"></iframe>'
    const result = await transform(value, customContext)

    expect(result).toContain('data-embed-src="custom-scheme://payload"')
  })
})
