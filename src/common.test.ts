import { describe, expect, it } from 'bun:test'
import {
  applyDomTransforms,
  createEmbedPlaceholder,
  expandSvgSelfClose,
  parseFragment,
  stripOversizedBase64Sources,
  transformHtml,
} from './common.js'

describe('transformHtml', () => {
  it('should preserve content when transform is a no-op', async () => {
    const html = '<p>Hello world</p>'

    expect(await transformHtml(html, () => {})).toContain('<p>Hello world</p>')
  })

  it('should allow modifying the DOM', async () => {
    const html = '<p><img data-src="img.jpg"></p>'
    const result = await transformHtml(html, (document) => {
      for (const image of document.querySelectorAll('img[data-src]')) {
        const dataSrc = image.getAttribute('data-src')

        if (dataSrc) {
          image.setAttribute('src', dataSrc)
          image.removeAttribute('data-src')
        }
      }
    })

    expect(result).toContain('src="img.jpg"')
    expect(result).not.toContain('data-src')
  })

  it('should handle empty string', async () => {
    expect(await transformHtml('', () => {})).toBeDefined()
  })
})

describe('stripOversizedBase64Sources', () => {
  it('should strip base64 src exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src="data:image/png;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<img src="">')
  })

  it('should preserve base64 src under max size', () => {
    const value = '<img src="data:image/png;base64,iVBOR=">'

    expect(stripOversizedBase64Sources(value, 50 * 1024)).toBe(value)
  })

  it('should strip base64 srcset exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<source srcset="data:image/webp;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<source srcset="">')
  })

  it('should strip base64 poster exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<video poster="data:image/jpeg;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<video poster="">')
  })

  it('should strip only oversized sources when mixed with small ones', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src="data:image/png;base64,small="><img src="data:image/png;base64,${largeData}">`

    const result = stripOversizedBase64Sources(value, 50)

    expect(result).toContain('data:image/png;base64,small=')
    expect(result).not.toContain(largeData)
  })

  it('should not modify regular url src attributes', () => {
    const value = '<img src="https://example.com/image.png">'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should not modify data uris without base64 encoding', () => {
    const value = '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should return html unchanged when no base64 present', () => {
    const value = '<p>Hello world</p>'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should handle single-quoted attributes', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src='data:image/png;base64,${largeData}'>`

    expect(stripOversizedBase64Sources(value, 50)).toBe("<img src=''>")
  })
})

describe('createEmbedPlaceholder', () => {
  describe('fallback link', () => {
    it('should use metadata.url when present', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://embed.example/abc', {
        provider: 'custom',
        src: 'https://embed.example/abc',
        url: 'https://canonical.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://canonical.example/abc')
    })

    it('should fall back to metadata.src when url is absent', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://passed-src.example', {
        provider: 'custom',
        src: 'https://embed.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://embed.example/abc')
    })

    it('should fall back to src argument when metadata is omitted', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://passed-src.example')

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://passed-src.example')
    })
  })

  describe('thumbnail safety', () => {
    it('should keep http thumbnail', () => {
      const document = parseFragment('')
      const thumbnail = 'https://cdn.example/thumb.jpg'
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should keep data:image/png thumbnail', () => {
      const document = parseFragment('')
      const thumbnail = 'data:image/png;base64,iVBORw0KGgo='
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should keep data:image/jpeg thumbnail', () => {
      const document = parseFragment('')
      const thumbnail = 'data:image/jpeg;base64,/9j/4AAQ='
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should drop javascript: thumbnail', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'javascript:alert(1)',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
    })

    it('should drop data:image/svg+xml thumbnail', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'data:image/svg+xml;utf8,<svg/>',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
    })

    it('should drop data:text/html thumbnail', () => {
      const document = parseFragment('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'data:text/html,<script>1</script>',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
    })
  })
})

describe('parseFragment', () => {
  describe('attribute case normalization', () => {
    it('should lowercase uppercase attribute names', () => {
      const document = parseFragment('<img SRC="https://example.com/photo.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('src')).toBe('https://example.com/photo.jpg')
      expect(image?.hasAttribute('SRC')).toBe(false)
    })

    it('should lowercase mixed-case attribute names', () => {
      const document = parseFragment('<img SrcSet="a.jpg 1x, b.jpg 2x" Data-Src="c.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('srcset')).toBe('a.jpg 1x, b.jpg 2x')
      expect(image?.getAttribute('data-src')).toBe('c.jpg')
      expect(image?.hasAttribute('SrcSet')).toBe(false)
      expect(image?.hasAttribute('Data-Src')).toBe(false)
    })

    it('should lowercase POSTER and SRC on video elements', () => {
      const document = parseFragment(
        '<video SRC="https://example.com/clip.mp4" POSTER="https://example.com/thumb.jpg"></video>',
      )
      const video = document.querySelector('video')

      expect(video?.getAttribute('src')).toBe('https://example.com/clip.mp4')
      expect(video?.getAttribute('poster')).toBe('https://example.com/thumb.jpg')
    })

    it('should keep the first occurrence when duplicates collide after lowercasing', () => {
      const document = parseFragment('<img SRC="first.jpg" src="second.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('src')).toBe('first.jpg')
    })

    it('should leave already-lowercase attributes untouched', () => {
      const document = parseFragment('<a href="/about" class="nav">About</a>')
      const anchor = document.querySelector('a')

      expect(anchor?.getAttribute('href')).toBe('/about')
      expect(anchor?.getAttribute('class')).toBe('nav')
    })
  })
})

describe('expandSvgSelfClose', () => {
  it('should expand self-closing tags inside svg', () => {
    const value = '<svg><title /><path d="M0 0" /></svg>'
    const expected = '<svg><title ></title><path d="M0 0" ></path></svg>'

    expect(expandSvgSelfClose(value)).toBe(expected)
  })

  it('should preserve self-closing tags outside svg regions', () => {
    const value = '<p><br /><img src="a.png" /></p>'

    expect(expandSvgSelfClose(value)).toBe(value)
  })

  // The regex captures `\s[^>]*` greedily for attributes, so a trailing space
  // before `/>` stays inside the open tag. Cosmetic only — produces valid HTML.
  it('should only expand inside the svg region when mixed with non-svg', () => {
    const value = '<p><br /></p><svg><circle r="5" /></svg><img src="a.png" />'
    const expected = '<p><br /></p><svg><circle r="5" ></circle></svg><img src="a.png" />'

    expect(expandSvgSelfClose(value)).toBe(expected)
  })

  it('should expand multiple self-closing tags within a single svg', () => {
    const value = '<svg><title /><desc /><path d="M0 0" /></svg>'
    const expected = '<svg><title ></title><desc ></desc><path d="M0 0" ></path></svg>'

    expect(expandSvgSelfClose(value)).toBe(expected)
  })

  it('should handle nested svg regions independently', () => {
    const value = '<svg><circle r="5" /></svg><div><svg><rect width="1" /></svg></div>'
    const expected =
      '<svg><circle r="5" ></circle></svg><div><svg><rect width="1" ></rect></svg></div>'

    expect(expandSvgSelfClose(value)).toBe(expected)
  })

  it('should handle svg with attributes', () => {
    const value = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0" /></svg>'
    const expected = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0" ></path></svg>'

    expect(expandSvgSelfClose(value)).toBe(expected)
  })

  it('should return empty string unchanged', () => {
    expect(expandSvgSelfClose('')).toBe('')
  })

  it('should return input unchanged when no svg present', () => {
    const value = '<p>Hello world</p>'

    expect(expandSvgSelfClose(value)).toBe(value)
  })

  it('should fix linkedom svg nesting via parseFragment', () => {
    // Without expansion, linkedom parses `<path />` as a child of `<title>`
    // because the self-close on a non-void HTML element is ignored. With
    // expansion, path is a sibling of title.
    const document = parseFragment('<svg><title /><path d="M0 0" /></svg>')
    const svg = document.querySelector('svg')
    const path = svg?.querySelector('path')

    expect(path?.parentElement?.tagName.toLowerCase()).toBe('svg')
  })
})

describe('applyDomTransforms', () => {
  describe('base64 stripping', () => {
    it('should preserve small base64 images through dom transforms', async () => {
      const value = '<p>Text</p><img src="data:image/png;base64,iVBORw0KGgo=">'

      expect(await applyDomTransforms(value, [])).toContain('data:image/png;base64,iVBORw0KGgo=')
    })

    it('should strip oversized base64 images during dom transforms', async () => {
      const largeData = 'A'.repeat(100 * 1024)
      const value = `<p>Text</p><img src="data:image/png;base64,${largeData}">`
      const result = await applyDomTransforms(value, [])

      expect(result).toContain('<p>Text</p>')
      expect(result).not.toContain(largeData)
    })
  })
})
