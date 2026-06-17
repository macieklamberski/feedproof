import { describe, expect, it } from 'bun:test'
import {
  applyDomTransforms,
  applyStringTransforms,
  createBookmarkPlaceholder,
  createEmbedPlaceholder,
  createPlaceholder,
  getElementDimensions,
  hasAncestorWithTagName,
  isElementHidden,
  isJsonLike,
  isParseableJson,
  isSafeThumbnailUrl,
  normalizeEmbedFields,
  updateEmbedPlaceholder,
} from './common.js'
import { describeForEachParser, html, queryElement } from './tests.js'
import type { BookmarkResolverResult } from './types.js'

describe('isSafeThumbnailUrl', () => {
  it('should accept an absolute https url', () => {
    expect(isSafeThumbnailUrl('https://cdn.example.com/thumb.jpg')).toBe(true)
  })

  it('should accept an absolute http url', () => {
    expect(isSafeThumbnailUrl('http://cdn.example.com/thumb.jpg')).toBe(true)
  })

  it('should accept a data:image/png url', () => {
    expect(isSafeThumbnailUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
  })

  it('should reject a data:image/svg+xml url', () => {
    expect(isSafeThumbnailUrl('data:image/svg+xml;utf8,<svg/>')).toBe(false)
  })

  it('should reject a data:text/html url', () => {
    expect(isSafeThumbnailUrl('data:text/html,<script>1</script>')).toBe(false)
  })

  it('should reject a javascript: url', () => {
    expect(isSafeThumbnailUrl('javascript:alert(1)')).toBe(false)
  })

  it('should reject a relative url', () => {
    expect(isSafeThumbnailUrl('/thumb.jpg')).toBe(false)
  })

  it('should reject an empty string', () => {
    expect(isSafeThumbnailUrl('')).toBe(false)
  })
})

describeForEachParser('applyDomTransforms', (parseHtml) => {
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

  it.todo('should propagate an error thrown by a transform', () => {
    // A transform that throws should reject the applyDomTransforms promise and
    // prevent later transforms in the array from running.
  })
})

describe('applyStringTransforms', () => {
  it('should return the input unchanged when given no transforms', async () => {
    expect(await applyStringTransforms('<p>Hello</p>', [])).toBe('<p>Hello</p>')
  })

  it('should pipe the output of each transform into the next in order', async () => {
    const transforms = [
      (html: string) => `${html}<p>first</p>`,
      async (html: string) => `${html}<p>second</p>`,
    ]
    const expected = html`
      <p>Hello</p>
      <p>first</p>
      <p>second</p>
    `

    expect(await applyStringTransforms('<p>Hello</p>', transforms)).toBe(expected)
  })
})

describeForEachParser('createEmbedPlaceholder', (parseHtml) => {
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

  it.todo('should write the full metadata as data-embed-* attributes', () => {
    // Pass every EmbedResolverResult field and assert the complete placeholder
    // markup: all data-embed-* attributes plus the fallback anchor.
  })

  it.todo('should drop an unsafe thumbnail passed through this entry point', () => {
    // metadata.thumbnail = 'javascript:alert(1)' must not become a
    // data-embed-thumbnail attribute on the placeholder.
  })
})

describeForEachParser('updateEmbedPlaceholder', (parseHtml) => {
  it('should write normalized metadata as data-embed-* attributes', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateEmbedPlaceholder(element, {
      src: 'http://embed.example/abc',
      title: 'Video title',
      duration: 125,
    })

    const expected = html`
      <div
        data-embed-src="https://embed.example/abc"
        data-embed-title="Video title"
        data-embed-duration="125"
      >
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should not overwrite attributes already present on the element', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-embed-title', 'Original title')

    updateEmbedPlaceholder(element, { title: 'Replacement title', author: 'Channel name' })

    const expected = html`
      <div data-embed-title="Original title" data-embed-author="Channel name"></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })
})

describe('normalizeEmbedFields', () => {
  describe('src and url protocol upgrade', () => {
    it('should upgrade http:// to https://', () => {
      const value = {
        src: 'http://embed.example/abc',
        url: 'http://page.example/x',
      }
      const expected: Record<string, string | undefined> = {
        src: 'https://embed.example/abc',
        url: 'https://page.example/x',
      }

      expect(normalizeEmbedFields(value)).toEqual(expected)
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
      const value = {
        thumbnail: 'http://cdn.example/thumb.jpg',
        avatar: 'http://cdn.example/avatar.jpg',
      }
      const expected: Record<string, string | undefined> = {
        thumbnail: 'http://cdn.example/thumb.jpg',
        avatar: 'http://cdn.example/avatar.jpg',
      }

      expect(normalizeEmbedFields(value)).toEqual(expected)
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
      const value = { width: 640, height: 360, duration: 125 }
      const expected: Record<string, string | undefined> = {
        width: '640',
        height: '360',
        duration: '125',
      }

      expect(normalizeEmbedFields(value)).toEqual(expected)
    })

    it.todo('should drop zero width, height and duration', () => {
      // Zero is falsy in normalizeEmbedFields, so width/height/duration of 0 are
      // emitted as undefined rather than the string '0'.
    })
  })

  describe('shape', () => {
    it('should pass text fields through unchanged', () => {
      const value = {
        provider: 'youtube',
        id: 'abc',
        title: 'Title',
        description: 'Desc',
        author: 'Author',
      }
      const expected: Record<string, string | undefined> = {
        provider: 'youtube',
        id: 'abc',
        title: 'Title',
        description: 'Desc',
        author: 'Author',
      }

      expect(normalizeEmbedFields(value)).toEqual(expected)
    })

    it('should leave absent fields undefined', () => {
      const expected: Record<string, string | undefined> = {
        src: 'https://embed.example',
      }

      expect(normalizeEmbedFields({ src: 'https://embed.example' })).toEqual(expected)
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

describeForEachParser('getElementDimensions', (parseHtml) => {
  it('should return both dimensions from attributes', () => {
    const document = parseHtml('<img width="320" height="240">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 320, height: 240 })
  })

  it('should return only width when only width attribute is set', () => {
    const document = parseHtml('<img width="100">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 100, height: undefined })
  })

  it('should read px-suffixed dimensions from style when attributes are missing', () => {
    const document = parseHtml('<img style="width: 50px; height: 25px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 50, height: 25 })
  })

  it('should read unitless dimensions from style', () => {
    const document = parseHtml('<img style="width: 10; height: 5">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 10, height: 5 })
  })

  it('should ignore em / rem / % units in style', () => {
    const document = parseHtml('<img style="width: 1.5em; height: 100%">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should fall back to style when attribute is non-numeric', () => {
    const document = parseHtml('<img width="auto" style="width: 200px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 200, height: undefined })
  })

  it('should prefer attribute over style when both are present', () => {
    const document = parseHtml('<img width="100" style="width: 999px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 100, height: undefined })
  })

  it('should return both undefined for an element with neither', () => {
    const document = parseHtml('<img>')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should extract the correct property from multi-property style', () => {
    const document = parseHtml('<img style="color: red; width: 10px; height: 20px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 10, height: 20 })
  })

  it('should parse decimal dimensions from style', () => {
    const document = parseHtml('<img style="width: 1.5px; height: 2.5">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 1.5, height: 2.5 })
  })
})

describeForEachParser('isElementHidden', (parseHtml) => {
  it('should return true for the hidden attribute', () => {
    const document = parseHtml('<div hidden>x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should return true for inline display:none', () => {
    const document = parseHtml('<div style="display: none">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should return true for inline visibility:hidden', () => {
    const document = parseHtml('<div style="visibility: hidden">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should match display:none among other declarations', () => {
    const document = parseHtml('<div style="color: red; display: none">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should not treat opacity:0 as hidden', () => {
    const document = parseHtml('<div style="opacity: 0">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })

  it('should not treat a 0×0 size as hidden', () => {
    const document = parseHtml('<div style="width: 0; height: 0">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })

  it('should return false for a visible element', () => {
    const document = parseHtml('<div style="color: red">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })
})

describeForEachParser('hasAncestorWithTagName', (parseHtml) => {
  const tagSet = new Set(['pre', 'code'])

  it('should return true when direct parent matches', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return true when a deeply nested ancestor matches', () => {
    const document = parseHtml('<pre><div><section><span>x</span></section></div></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return false when no ancestor matches', () => {
    const document = parseHtml('<div><p><span>x</span></p></div>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(false)
  })

  it('should return false when node has no parent', () => {
    const document = parseHtml('')
    const orphan = document.createElement('span')

    expect(hasAncestorWithTagName(orphan, tagSet)).toBe(false)
  })

  it('should return false for an empty Set', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, new Set())).toBe(false)
  })

  it('should stop walking at the stopAt boundary', () => {
    const document = parseHtml('<pre><div><span>x</span></div></pre>')
    const span = queryElement(document, 'span')
    const div = queryElement(document, 'div')

    expect(hasAncestorWithTagName(span, tagSet, div)).toBe(false)
  })

  it('should not check the stopAt boundary itself', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')
    const pre = queryElement(document, 'pre')

    expect(hasAncestorWithTagName(span, tagSet, pre)).toBe(false)
  })
})

describeForEachParser('createPlaceholder', (parseHtml) => {
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
    // @ts-expect-error: This is for testing purposes.
    fields.id = null
    const element = createPlaceholder(document, 'embed', fields)

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.hasAttribute('data-embed-id')).toBe(false)
  })
})

describeForEachParser('createBookmarkPlaceholder', (parseHtml) => {
  it('should write all fields and append a link labelled with the title', () => {
    const document = parseHtml('')
    const value: BookmarkResolverResult = {
      provider: 'ghost',
      url: 'https://example.com/post',
      title: 'Post title',
      description: 'Preview text',
      author: 'Author name',
      publisher: 'Publisher name',
      icon: 'https://example.com/favicon.ico',
      thumbnail: 'https://example.com/og-image.jpg',
    }
    const element = createBookmarkPlaceholder(document, value)
    const expected = html`
      <div
        data-bookmark-provider="ghost"
        data-bookmark-description="Preview text"
        data-bookmark-author="Author name"
        data-bookmark-publisher="Publisher name"
        data-bookmark-url="https://example.com/post"
        data-bookmark-title="Post title"
        data-bookmark-icon="https://example.com/favicon.ico"
        data-bookmark-thumbnail="https://example.com/og-image.jpg"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should upgrade http:// in url, icon and thumbnail', () => {
    const document = parseHtml('')
    const value: BookmarkResolverResult = {
      provider: 'ghost',
      url: 'http://example.com/post',
      title: 'Post title',
      icon: 'http://example.com/favicon.ico',
      thumbnail: 'http://example.com/og-image.jpg',
    }
    const element = createBookmarkPlaceholder(document, value)
    const expected = html`
      <div
        data-bookmark-provider="ghost"
        data-bookmark-url="https://example.com/post"
        data-bookmark-title="Post title"
        data-bookmark-icon="https://example.com/favicon.ico"
        data-bookmark-thumbnail="https://example.com/og-image.jpg"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should drop unsafe icon and thumbnail urls', () => {
    const document = parseHtml('')
    const value: BookmarkResolverResult = {
      provider: 'ghost',
      url: 'https://example.com/post',
      title: 'Post title',
      icon: 'javascript:alert(1)',
      thumbnail: 'data:image/svg+xml;utf8,<svg/>',
    }
    const element = createBookmarkPlaceholder(document, value)
    const expected = html`
      <div
        data-bookmark-provider="ghost"
        data-bookmark-url="https://example.com/post"
        data-bookmark-title="Post title"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })
})

describe('isJsonLike', () => {
  describe('valid JSON objects', () => {
    it('should identify simple JSON object', () => {
      expect(isJsonLike('{"name":"John","age":30}')).toBe(true)
    })

    it('should identify JSON object with whitespace', () => {
      expect(isJsonLike('  {  "name" : "John"  }  ')).toBe(true)
    })

    it('should identify empty JSON object', () => {
      expect(isJsonLike('{}')).toBe(true)
    })

    it('should identify empty JSON object with whitespace', () => {
      expect(isJsonLike('  {  }  ')).toBe(true)
    })

    it('should identify nested JSON object', () => {
      expect(isJsonLike('{"person":{"name":"John","age":30}}')).toBe(true)
    })

    it('should identify multiline JSON object', () => {
      const value = `{
        "name": "John",
        "age": 30
      }`

      expect(isJsonLike(value)).toBe(true)
    })
  })

  describe('valid JSON arrays', () => {
    it('should identify simple JSON array', () => {
      expect(isJsonLike('[1,2,3]')).toBe(true)
    })

    it('should identify JSON array with whitespace', () => {
      expect(isJsonLike('  [  1, 2, 3  ]  ')).toBe(true)
    })

    it('should identify empty JSON array', () => {
      expect(isJsonLike('[]')).toBe(true)
    })

    it('should identify empty JSON array with whitespace', () => {
      expect(isJsonLike('  [  ]  ')).toBe(true)
    })

    it('should identify array of objects', () => {
      expect(isJsonLike('[{"id":1},{"id":2}]')).toBe(true)
    })

    it('should identify multiline JSON array', () => {
      const value = `[
        {"name": "John"},
        {"name": "Jane"}
      ]`

      expect(isJsonLike(value)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should reject string with JSON-like content embedded', () => {
      expect(isJsonLike('Text before {"name":"John"} text after')).toBe(false)
    })

    it('should reject string with escaped braces', () => {
      expect(isJsonLike('"\\{\\"name\\":\\"John\\"\\}"')).toBe(false)
    })

    it('should reject strings that start with brace but end differently', () => {
      expect(isJsonLike('{ "name": "test" ]')).toBe(false)
    })

    it('should reject strings that start with bracket but end differently', () => {
      expect(isJsonLike('[ 1, 2, 3 }')).toBe(false)
    })
  })

  describe('invalid JSON-like structures', () => {
    it('should reject plain string', () => {
      expect(isJsonLike('Hello World')).toBe(false)
    })

    it('should reject number', () => {
      expect(isJsonLike('42')).toBe(false)
    })

    it('should reject boolean', () => {
      expect(isJsonLike('true')).toBe(false)
    })

    it('should reject null', () => {
      expect(isJsonLike('null')).toBe(false)
    })

    it('should reject unbalanced braces', () => {
      expect(isJsonLike('{"name":"John"')).toBe(false)
    })

    it('should reject unbalanced brackets', () => {
      expect(isJsonLike('[1,2,3')).toBe(false)
    })

    it('should reject mixed opening/closing (braces)', () => {
      expect(isJsonLike('{]')).toBe(false)
    })

    it('should reject mixed opening/closing (brackets)', () => {
      expect(isJsonLike('[}')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isJsonLike('')).toBe(false)
    })

    it('should reject whitespace only', () => {
      expect(isJsonLike('   ')).toBe(false)
    })

    it('should reject too short string', () => {
      expect(isJsonLike('{')).toBe(false)
      expect(isJsonLike('[')).toBe(false)
    })
  })
})

describe('isParseableJson', () => {
  it('should accept a valid JSON object', () => {
    expect(isParseableJson('{"name":"John","age":30}')).toBe(true)
  })

  it('should accept a valid JSON array', () => {
    expect(isParseableJson('[1, 2, 3]')).toBe(true)
  })

  it('should reject a JSON-shaped but unparseable object (CSS rule)', () => {
    expect(isParseableJson('{ color: red; padding: 4px }')).toBe(false)
  })

  it('should reject trailing-comma JSON5/JSONC dialects', () => {
    expect(isParseableJson('{"a": 1,}')).toBe(false)
  })

  it('should reject a plain string', () => {
    expect(isParseableJson('Hello World')).toBe(false)
  })
})
