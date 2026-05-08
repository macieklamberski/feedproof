import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import type { TransformContext } from '../../types.js'
import { injectEnclosureEmbedPlaceholders } from './injectEnclosureEmbedPlaceholders.js'

const context: TransformContext = { baseUrl: undefined }

const withResolver: TransformContext = {
  ...context,
  embedResolvers: [youtubeEmbedResolver],
}

const withEnclosures = (
  enclosures: Array<{ url: string; type?: string; medium?: string }>,
): TransformContext => {
  return { ...withResolver, enclosures }
}

describe('injectEnclosureEmbedPlaceholders', () => {
  it('should inject video enclosure as embed placeholder', () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="video"')
    expect(result).toContain('data-embed-src="https://example.com/clip.mp4"')
  })

  it('should include fallback link in injected enclosure placeholder', () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('<a href="https://example.com/clip.mp4">')
  })

  it('should inject enclosure before existing content', () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))
    const embedIndex = result.indexOf('data-embed=')
    const contentIndex = result.indexOf('Episode notes')

    expect(embedIndex).toBeLessThan(contentIndex)
  })

  it('should inject audio enclosure as embed placeholder', () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="audio"')
    expect(result).toContain('data-embed-src="https://example.com/episode.mp3"')
  })

  it('should resolve video enclosure through embedResolver', () => {
    const value = '<p>Episode notes</p>'
    const ctx = withEnclosures([{ url: 'https://www.youtube.com/embed/abc123', medium: 'video' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
  })

  it('should skip enclosures already present in content', () => {
    const value = '<p>Content</p><video src="https://example.com/clip.mp4"></video>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))
    const matches = result.match(/example\.com\/clip\.mp4/g)

    expect(matches).toHaveLength(1)
  })

  it('should skip image enclosures', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should skip enclosures without type or medium', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/file.bin' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should inject multiple enclosures', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
      { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
    ])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="audio"')
    expect(result).toContain('data-embed="video"')
  })

  it('should detect audio by medium field', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/episode.mp3', medium: 'audio' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="audio"')
  })

  it('should detect video by medium field', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="video"')
  })

  it('should do nothing when no enclosures', () => {
    const result = transformHtml('<p>Content</p>', injectEnclosureEmbedPlaceholders(context))

    expect(result).not.toContain('data-embed')
  })

  it('should do nothing when enclosures is empty', () => {
    const ctx = withEnclosures([])
    const result = transformHtml('<p>Content</p>', injectEnclosureEmbedPlaceholders(ctx))

    expect(result).not.toContain('data-embed')
  })

  it('should resolve enclosure with unrecognized type through resolver', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://www.youtube.com/v/abc123', type: 'application/x-shockwave-flash' },
    ])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should use resolver type over enclosure medium', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([{ url: 'https://www.youtube.com/embed/abc123', medium: 'video' }])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).toContain('data-embed="iframe"')
  })

  it('should skip enclosure with unrecognized type and no resolver match', () => {
    const value = '<p>Content</p>'
    const ctx = withEnclosures([
      { url: 'https://example.com/widget.swf', type: 'application/x-shockwave-flash' },
    ])
    const result = transformHtml(value, injectEnclosureEmbedPlaceholders(ctx))

    expect(result).not.toContain('data-embed')
  })
})
