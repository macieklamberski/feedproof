import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import type { TransformContext } from '../../types.js'
import { injectEnclosures } from './injectEnclosures.js'

const context: TransformContext = {
  baseUrl: undefined,
  embedResolvers: [],
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

const withResolver: TransformContext = {
  ...context,
  embedResolvers: [youtubeEmbedResolver],
}

const withEnclosures = (
  enclosures: Array<{ url: string; type?: string; medium?: string }>,
): TransformContext => {
  return { ...withResolver, enclosures }
}

describe('injectEnclosures', () => {
  const transform = (html: string) => {
    return transformHtml(html, injectEnclosures(context))
  }

  it('should inject video enclosure as native video element', async () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('<video')
    expect(result).toContain('src="https://example.com/clip.mp4"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
  })

  it('should inject enclosure before existing content', async () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }])
    const result = await transformHtml(value, injectEnclosures(ctx))
    const embedIndex = result.indexOf('<audio')
    const contentIndex = result.indexOf('Episode notes')

    expect(embedIndex).toBeLessThan(contentIndex)
  })

  it('should inject audio enclosure as native audio element', async () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('<audio')
    expect(result).toContain('src="https://example.com/episode.mp3"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
  })

  it('should resolve video enclosure through embedResolver', async () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
  })

  it('should skip enclosures already present in content', async () => {
    const value = '<p>Content</p><video src="https://example.com/clip.mp4"></video>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const result = await transformHtml(value, injectEnclosures(ctx))
    const matches = result.match(/example\.com\/clip\.mp4/g)

    expect(matches).toHaveLength(1)
  })

  it('should skip image enclosures', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should skip enclosures without type or medium', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/file.bin' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should inject multiple enclosures', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
    ])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('<audio')
    expect(result).toContain('<video')
  })

  it('should detect audio by medium field', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', medium: 'audio' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('<audio')
  })

  it('should detect video by medium field', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('<video')
  })

  it('should do nothing when no enclosures', async () => {
    const result = await transform('<p>Content</p>')

    expect(result).not.toContain('data-embed')
  })

  it('should do nothing when enclosures is empty', async () => {
    const ctx = withEnclosures([])
    const result = await transformHtml('<p>Content</p>', injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should resolve enclosure with unrecognized type through resolver', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://www.youtube.com/v/dQw4w9WgXcQ', type: 'application/x-shockwave-flash' },
    ])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should use resolver type over enclosure medium', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' },
    ])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).toContain('data-embed="iframe"')
  })

  it('should skip enclosure with unrecognized type and no resolver match', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://example.com/widget.swf', type: 'application/x-shockwave-flash' },
    ])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should skip enclosure with javascript: url', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'javascript:alert(1)', medium: 'video' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
    expect(result).not.toContain('javascript:')
  })

  it('should skip enclosure with data: url', async () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'data:text/html,<script>1</script>', medium: 'video' }])
    const result = await transformHtml(value, injectEnclosures(ctx))

    expect(result).not.toContain('data-embed')
  })
})
