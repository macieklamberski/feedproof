import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { EmbedResolverResult, TransformContext } from '../types.js'
import { replaceMediaWithEmbedPlaceholders } from './replaceMediaWithEmbedPlaceholders.js'

const context: TransformContext = { baseUrl: undefined }

const youtubeResolver = (url: string): EmbedResolverResult | undefined => {
  try {
    const { hostname, pathname } = new URL(url)

    if (!hostname.includes('youtube')) {
      return
    }

    const videoId = pathname.split('/').pop()

    return {
      provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      type: 'iframe',
    }
  } catch {}
}

const embedDomains = ['youtube-nocookie.com', 'youtube.com', 'player.vimeo.com']

const withResolver: TransformContext = {
  ...context,
  resolveEmbed: youtubeResolver,
  embedDomains,
}

const withDomainsOnly: TransformContext = {
  ...context,
  embedDomains,
}

describe('replaceMediaWithEmbedPlaceholders', () => {
  it('should replace youtube iframe with resolved placeholder', () => {
    const value = '<p>Text</p><iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

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
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('<a href="https://www.youtube.com/watch?v=abc123">')
    expect(result).toContain('https://www.youtube.com/watch?v=abc123</a>')
  })

  it('should include fallback link with src when no canonical url', () => {
    const value = '<iframe src="https://player.vimeo.com/video/12345"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).toContain('<a href="https://player.vimeo.com/video/12345">')
  })

  it('should preserve iframe dimensions as data attributes', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/abc123" width="640" height="360"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('data-embed-width="640"')
    expect(result).toContain('data-embed-height="360"')
  })

  it('should replace unresolved iframe from embed domain with generic placeholder', () => {
    const value = '<iframe src="https://player.vimeo.com/video/12345"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-src="https://player.vimeo.com/video/12345"')
    expect(result).not.toContain('<iframe')
  })

  it('should leave iframe from unknown domain untouched', () => {
    const value = '<iframe src="https://unknown-site.com/embed/123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).toContain('<iframe')
    expect(result).not.toContain('data-embed')
  })

  it('should replace multiple iframes in same content', () => {
    const value =
      '<iframe src="https://www.youtube.com/embed/abc123"></iframe><iframe src="https://player.vimeo.com/video/456"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-src="https://player.vimeo.com/video/456"')
  })

  it('should skip iframe without src attribute', () => {
    const value = '<iframe></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).not.toContain('data-embed')
  })

  it('should do nothing when no resolveEmbed or embedDomains provided', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(context))

    expect(result).toContain('<iframe')
  })

  it('should match embed domain with subdomain', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('<iframe')
  })

  it('should set autoload on unresolved embed domain iframe', () => {
    const value = '<iframe src="https://player.vimeo.com/video/12345"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).toContain('data-embed-autoload')
  })

  it('should not set autoload on resolved iframe', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).not.toContain('data-embed-autoload')
  })

  it('should use resolver type over default type', () => {
    const value = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('data-embed="iframe"')
    expect(result).not.toContain('data-embed="video"')
  })

  it('should leave video elements untouched', () => {
    const value = '<video src="https://example.com/clip.mp4"></video>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('<video')
    expect(result).not.toContain('data-embed')
  })

  it('should leave audio elements untouched', () => {
    const value = '<audio src="https://example.com/episode.mp3"></audio>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('<audio')
    expect(result).not.toContain('data-embed')
  })

  it('should handle iframe with malformed src url gracefully', () => {
    const value = '<iframe src="not-a-valid-url"></iframe>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withDomainsOnly))

    expect(result).not.toContain('data-embed')
  })

  it('should preserve surrounding content when replacing media', () => {
    const value =
      '<p>Before</p><iframe src="https://www.youtube.com/embed/abc123"></iframe><p>After</p>'
    const result = transformHtml(value, replaceMediaWithEmbedPlaceholders(withResolver))

    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('data-embed="iframe"')
  })
})
