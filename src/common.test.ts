import { describe, expect, it } from 'bun:test'
import {
  applyDomTransforms,
  createEmbedPlaceholder,
  createPlaceholder,
  getDimensions,
  hasAncestorWithTagName,
  normalizeEmbedFields,
} from './common.js'
import { parseHtml } from './parsers/linkedom.js'

describe('applyDomTransforms', () => {
  it('should return body innerHTML when given no transforms', async () => {
    const document = parseHtml('<p>Hello</p>')

    expect(await applyDomTransforms(document, [])).toBe('<p>Hello</p>')
  })

  it('should run each transform against the document in order', async () => {
    const document = parseHtml('<p>Hello</p>')
    const transforms = [
      (doc: Document) => {
        doc.querySelector('p')?.setAttribute('data-step', '1')
      },
      (doc: Document) => {
        doc.querySelector('p')?.setAttribute('data-step', '2')
      },
    ]

    expect(await applyDomTransforms(document, transforms)).toBe('<p data-step="2">Hello</p>')
  })

  it('should support async transforms', async () => {
    const document = parseHtml('<p>Hello</p>')
    const transforms = [
      async (doc: Document) => {
        await Promise.resolve()
        doc.querySelector('p')?.setAttribute('data-async', 'yes')
      },
    ]

    expect(await applyDomTransforms(document, transforms)).toBe('<p data-async="yes">Hello</p>')
  })
})

describe('createEmbedPlaceholder', () => {
  describe('fallback link', () => {
    it('should use metadata.url when present', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://embed.example/abc', {
        provider: 'custom',
        src: 'https://embed.example/abc',
        url: 'https://canonical.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://canonical.example/abc')
    })

    it('should fall back to metadata.src when url is absent', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://passed-src.example', {
        provider: 'custom',
        src: 'https://embed.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://embed.example/abc')
    })

    it('should fall back to src argument when metadata is omitted', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://passed-src.example')

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://passed-src.example')
    })
  })

  describe('src wiring', () => {
    it('should write the src argument as data-embed-src', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'http://self-hosted.example/player')

      expect(element.getAttribute('data-embed-src')).toBe('https://self-hosted.example/player')
    })

    it('should let metadata.src override the src argument', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://passed-src.example', {
        src: 'http://embed.example/abc',
      })

      expect(element.getAttribute('data-embed-src')).toBe('https://embed.example/abc')
    })

    it('should upgrade http:// in the fallback anchor href', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'http://self-hosted.example/player')

      expect(element.querySelector('a')?.getAttribute('href')).toBe(
        'https://self-hosted.example/player',
      )
    })
  })
})

describe('normalizeEmbedFields', () => {
  describe('src and url protocol upgrade', () => {
    it('should upgrade http:// to https://', () => {
      const fields = normalizeEmbedFields({
        src: 'http://embed.example/abc',
        url: 'http://page.example/x',
      })

      expect(fields.src).toBe('https://embed.example/abc')
      expect(fields.url).toBe('https://page.example/x')
    })

    it('should leave https:// unchanged', () => {
      expect(normalizeEmbedFields({ src: 'https://embed.example/abc' }).src).toBe(
        'https://embed.example/abc',
      )
    })

    it('should leave protocol-relative URLs unchanged', () => {
      expect(normalizeEmbedFields({ src: '//embed.example/abc' }).src).toBe('//embed.example/abc')
    })

    it('should be case-insensitive on the protocol', () => {
      expect(normalizeEmbedFields({ src: 'HTTP://embed.example/abc' }).src).toBe(
        'https://embed.example/abc',
      )
    })

    it('should only touch the leading protocol, not occurrences later in the URL', () => {
      expect(
        normalizeEmbedFields({ src: 'http://proxy.example/?target=http://other.example/page' }).src,
      ).toBe('https://proxy.example/?target=http://other.example/page')
    })
  })

  describe('thumbnail and avatar safety', () => {
    it('should keep a safe http thumbnail and avatar without upgrading them', () => {
      const fields = normalizeEmbedFields({
        thumbnail: 'http://cdn.example/thumb.jpg',
        avatar: 'http://cdn.example/avatar.jpg',
      })

      expect(fields.thumbnail).toBe('http://cdn.example/thumb.jpg')
      expect(fields.avatar).toBe('http://cdn.example/avatar.jpg')
    })

    it('should keep data:image thumbnails', () => {
      expect(
        normalizeEmbedFields({ thumbnail: 'data:image/png;base64,iVBORw0KGgo=' }).thumbnail,
      ).toBe('data:image/png;base64,iVBORw0KGgo=')
    })

    it('should drop javascript: thumbnails', () => {
      expect(normalizeEmbedFields({ thumbnail: 'javascript:alert(1)' }).thumbnail).toBeUndefined()
    })

    it('should drop data:image/svg+xml thumbnails', () => {
      expect(
        normalizeEmbedFields({ thumbnail: 'data:image/svg+xml;utf8,<svg/>' }).thumbnail,
      ).toBeUndefined()
    })

    it('should drop unsafe avatars', () => {
      expect(
        normalizeEmbedFields({ avatar: 'data:text/html,<script>1</script>' }).avatar,
      ).toBeUndefined()
    })
  })

  describe('numeric coercion', () => {
    it('should stringify width, height and duration', () => {
      const fields = normalizeEmbedFields({ width: 640, height: 360, duration: 125 })

      expect(fields.width).toBe('640')
      expect(fields.height).toBe('360')
      expect(fields.duration).toBe('125')
    })
  })

  describe('shape', () => {
    it('should pass text fields through unchanged', () => {
      expect(
        normalizeEmbedFields({
          provider: 'youtube',
          id: 'abc',
          title: 'Title',
          description: 'Desc',
          author: 'Author',
        }),
      ).toMatchObject({
        provider: 'youtube',
        id: 'abc',
        title: 'Title',
        description: 'Desc',
        author: 'Author',
      })
    })

    it('should leave absent fields undefined', () => {
      const fields = normalizeEmbedFields({ src: 'https://embed.example' })

      expect(fields.title).toBeUndefined()
      expect(fields.thumbnail).toBeUndefined()
      expect(fields.width).toBeUndefined()
    })

    it('should return fields in a stable key order', () => {
      const fields = normalizeEmbedFields({
        provider: 'p',
        id: 'i',
        src: 's',
        url: 'u',
        thumbnail: 'https://cdn.example/t.jpg',
        width: 1,
        height: 2,
        title: 't',
        description: 'd',
        author: 'a',
        avatar: 'https://cdn.example/a.jpg',
        duration: 3,
      })

      expect(Object.keys(fields)).toEqual([
        'src',
        'provider',
        'id',
        'url',
        'thumbnail',
        'width',
        'height',
        'title',
        'description',
        'author',
        'avatar',
        'duration',
      ])
    })
  })
})

describe('getDimensions', () => {
  it('should return both dimensions from attributes', () => {
    const document = parseHtml('<img width="320" height="240">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 320, height: 240 })
  })

  it('should return only width when only width attribute is set', () => {
    const document = parseHtml('<img width="100">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 100, height: undefined })
  })

  it('should read px-suffixed dimensions from style when attributes are missing', () => {
    const document = parseHtml('<img style="width: 50px; height: 25px">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 50, height: 25 })
  })

  it('should read unitless dimensions from style', () => {
    const document = parseHtml('<img style="width: 10; height: 5">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 10, height: 5 })
  })

  it('should ignore em / rem / % units in style', () => {
    const document = parseHtml('<img style="width: 1.5em; height: 100%">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should fall back to style when attribute is non-numeric', () => {
    const document = parseHtml('<img width="auto" style="width: 200px">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image).width).toBe(200)
  })

  it('should prefer attribute over style when both are present', () => {
    const document = parseHtml('<img width="100" style="width: 999px">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image).width).toBe(100)
  })

  it('should return both undefined for an element with neither', () => {
    const document = parseHtml('<img>')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should extract the correct property from multi-property style', () => {
    const document = parseHtml('<img style="color: red; width: 10px; height: 20px">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 10, height: 20 })
  })

  it('should parse decimal dimensions from style', () => {
    const document = parseHtml('<img style="width: 1.5px; height: 2.5">')
    const image = document.querySelector('img') as Element

    expect(getDimensions(image)).toEqual({ width: 1.5, height: 2.5 })
  })
})

describe('hasAncestorWithTagName', () => {
  const tagSet = new Set(['pre', 'code'])

  it('should return true when direct parent matches', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = document.querySelector('span') as Element

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return true when a deeply nested ancestor matches', () => {
    const document = parseHtml('<pre><div><section><span>x</span></section></div></pre>')
    const span = document.querySelector('span') as Element

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return false when no ancestor matches', () => {
    const document = parseHtml('<div><p><span>x</span></p></div>')
    const span = document.querySelector('span') as Element

    expect(hasAncestorWithTagName(span, tagSet)).toBe(false)
  })

  it('should return false when node has no parent', () => {
    const document = parseHtml('')
    const orphan = document.createElement('span')

    expect(hasAncestorWithTagName(orphan, tagSet)).toBe(false)
  })

  it('should return false for an empty Set', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = document.querySelector('span') as Element

    expect(hasAncestorWithTagName(span, new Set())).toBe(false)
  })

  it('should stop walking at the stopAt boundary', () => {
    const document = parseHtml('<pre><div><span>x</span></div></pre>')
    const span = document.querySelector('span') as Element
    const div = document.querySelector('div') as Element

    expect(hasAncestorWithTagName(span, tagSet, div)).toBe(false)
  })

  it('should not check the stopAt boundary itself', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = document.querySelector('span') as Element
    const pre = document.querySelector('pre') as Element

    expect(hasAncestorWithTagName(span, tagSet, pre)).toBe(false)
  })
})

describe('createPlaceholder', () => {
  it('should create an empty div for an empty field record', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {})

    expect(element.tagName.toLowerCase()).toBe('div')
    expect(element.attributes.length).toBe(0)
    expect(element.outerHTML).toBe('<div></div>')
  })

  it('should write a data-{type}-{key} attribute for every non-empty field', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {
      provider: 'youtube',
      id: 'abc123',
      src: 'https://www.youtube.com/embed/abc123',
      width: '560',
      height: '315',
    })

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.getAttribute('data-embed-id')).toBe('abc123')
    expect(element.getAttribute('data-embed-src')).toBe('https://www.youtube.com/embed/abc123')
    expect(element.getAttribute('data-embed-width')).toBe('560')
    expect(element.getAttribute('data-embed-height')).toBe('315')
  })

  it('should prefix attributes with the bookmark type', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'bookmark', {
      provider: 'ghost',
      url: 'https://example.com',
      title: 'Title',
    })

    expect(element.getAttribute('data-bookmark-provider')).toBe('ghost')
    expect(element.getAttribute('data-bookmark-url')).toBe('https://example.com')
    expect(element.getAttribute('data-bookmark-title')).toBe('Title')
  })

  it('should skip undefined fields', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {
      provider: 'youtube',
      title: undefined,
      author: undefined,
    })

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.hasAttribute('data-embed-title')).toBe(false)
    expect(element.hasAttribute('data-embed-author')).toBe(false)
  })

  it('should skip empty-string fields', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {
      provider: 'youtube',
      description: '',
      author: '',
    })

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.hasAttribute('data-embed-description')).toBe(false)
    expect(element.hasAttribute('data-embed-author')).toBe(false)
  })

  it('should write only the non-empty fields when some are absent', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'bookmark', {
      provider: 'ghost',
      url: 'https://example.com',
      title: '',
      icon: undefined,
      thumbnail: 'https://example.com/t.jpg',
    })

    expect(element.attributes.length).toBe(3)
    expect(element.hasAttribute('data-bookmark-title')).toBe(false)
    expect(element.hasAttribute('data-bookmark-icon')).toBe(false)
    expect(element.getAttribute('data-bookmark-thumbnail')).toBe('https://example.com/t.jpg')
  })

  it('should preserve values containing reserved characters verbatim', () => {
    const document = parseHtml('<div></div>')
    const value = 'https://example.com/p?a=1&b="2"&c=<x>'
    const element = createPlaceholder(document, 'bookmark', { url: value })

    expect(element.getAttribute('data-bookmark-url')).toBe(value)
  })

  it('should skip falsy non-string values such as null', () => {
    const document = parseHtml('<div></div>')
    const fields: Record<string, string | undefined> = { provider: 'youtube' }
    ;(fields as Record<string, unknown>).id = null
    const element = createPlaceholder(document, 'embed', fields)

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.hasAttribute('data-embed-id')).toBe(false)
  })
})
