import { describe, expect, it } from 'bun:test'
import { defaultDomTransforms, defaultStringTransforms } from './defaults.js'
import { transformContent } from './index.js'

const startsWithDiv = /^<div>/

describe('transformContent', () => {
  it('should apply all default transforms', () => {
    const html = '<div><p>Hello <img data-src="photo.jpg"></p></div>'
    const result = transformContent(html, { baseUrl: 'https://example.com' })

    // unwrapWrappers should remove the outer div.
    expect(result).not.toMatch(startsWithDiv)
    // fixLazyImages should resolve data-src to src, and resolveRelativeUrls makes it absolute.
    expect(result).toContain('src="https://example.com/photo.jpg"')
    expect(result).not.toContain('data-src')
  })

  it('should resolve relative URLs when baseUrl is provided', () => {
    const html = '<p><a href="/about">About</a></p>'
    const result = transformContent(html, { baseUrl: 'https://example.com/post/1' })

    expect(result).toContain('href="https://example.com/about"')
  })

  it('should strip tracking parameters', () => {
    const html = '<p><a href="https://example.com?utm_source=feed&id=1">Link</a></p>'
    const result = transformContent(html)

    expect(result).not.toContain('utm_source')
    expect(result).toContain('id=1')
  })

  it('should remove tracking pixels', () => {
    const html = '<p>Text</p><img width="1" height="1" src="https://track.example.com/pixel.gif">'
    const result = transformContent(html)

    expect(result).not.toContain('pixel.gif')
  })

  it('should allow overriding the dom transforms array', () => {
    const html = '<p><a href="https://example.com?utm_source=feed">Link</a></p>'
    const result = transformContent(html, {
      domTransforms: defaultDomTransforms.filter((t) => t.name !== 'stripTrackingParams'),
    })

    expect(result).toContain('utm_source')
  })

  it('should handle empty string', () => {
    const result = transformContent('')

    expect(result).toBeDefined()
  })

  it('should handle plain text by wrapping in paragraphs', () => {
    const result = transformContent('Hello world')

    expect(result).toContain('<p>Hello world</p>')
  })

  it('should use built-in YouTube embed resolver', () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcB" width="560" height="315"></iframe>'
    const result = transformContent(html)

    expect(result).toContain('data-embed="iframe"')
    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('youtube-nocookie.com')
  })

  it('should allow custom embedResolvers', () => {
    const html = '<iframe src="https://custom-player.example.com/video/123"></iframe>'
    const result = transformContent(html, {
      embedResolvers: [
        {
          selector: 'iframe[src]',
          extract: (element) => {
            const src = element.getAttribute('src') ?? ''
            if (src.includes('custom-player.example.com')) {
              return { provider: 'custom', src, type: 'iframe' }
            }
          },
        },
      ],
    })

    expect(result).toContain('data-embed-provider="custom"')
  })

  it('should inject audio/video enclosures as native media elements', () => {
    const html = '<p>Content</p>'
    const result = transformContent(html, {
      enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
    })

    expect(result).toContain('<audio')
    expect(result).toContain('audio.mp3')
  })

  it('should remove paragraphs left empty after boundary br stripping', () => {
    const html = '<p>Hello</p><p><br></p><p>World</p>'
    const result = transformContent(html)

    expect(result).toBe('<p>Hello</p><p>World</p>')
  })

  it('should preserve empty paragraphs when stripEmptyTags is removed from string phases', () => {
    const html = '<p>Hello</p><p><br></p><p>World</p>'
    const result = transformContent(html, {
      stringTransforms: defaultStringTransforms.filter((t) => t.name !== 'stripEmptyTags'),
      finalStringTransforms: [],
    })

    expect(result).toBe('<p>Hello</p><p></p><p>World</p>')
  })

  it('should preserve comments inside pre blocks through full pipeline', () => {
    const html = '<pre>before <!-- preserved --> after</pre>'
    const result = transformContent(html)

    expect(result).toContain('<!-- preserved -->')
  })
})
