import { describe, expect, it } from 'bun:test'
import {
  applyDomTransforms,
  createEmbedPlaceholder,
  getDimensions,
  hasAncestorWithTagName,
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

  describe('thumbnail safety', () => {
    it('should keep http thumbnail', () => {
      const document = parseHtml('')
      const thumbnail = 'https://cdn.example/thumb.jpg'
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should keep data:image/png thumbnail', () => {
      const document = parseHtml('')
      const thumbnail = 'data:image/png;base64,iVBORw0KGgo='
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should keep data:image/jpeg thumbnail', () => {
      const document = parseHtml('')
      const thumbnail = 'data:image/jpeg;base64,/9j/4AAQ='
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail,
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBe(thumbnail)
    })

    it('should drop javascript: thumbnail', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'javascript:alert(1)',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
    })

    it('should drop data:image/svg+xml thumbnail', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'data:image/svg+xml;utf8,<svg/>',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
    })

    it('should drop data:text/html thumbnail', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, 'https://embed.example', {
        thumbnail: 'data:text/html,<script>1</script>',
      })

      expect(element.getAttribute('data-embed-thumbnail')).toBeNull()
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
