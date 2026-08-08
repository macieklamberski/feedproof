import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult, EmbedResolverResult, GalleryResolverResult } from '../types.js'
import {
  createCitePlaceholder,
  createEmbedPlaceholder,
  createGalleryPlaceholder,
  createMarkupEmbedResolver,
  createPlaceholder,
  createUrlEmbedResolver,
  normalizeEmbedFields,
  rewriteGalleryItemUrls,
  updateCitePlaceholder,
  updateEmbedPlaceholder,
} from './widgets.js'

describeForEachParser('createEmbedPlaceholder', (parseHtml) => {
  describe('fallback link', () => {
    it('should use url when present', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        provider: 'custom',
        src: 'https://embed.example/abc',
        url: 'https://canonical.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://canonical.example/abc')
    })

    it('should fall back to src when url is absent', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        provider: 'custom',
        src: 'https://embed.example/abc',
      })

      expect(element.querySelector('a')?.getAttribute('href')).toBe('https://embed.example/abc')
    })
  })

  describe('src wiring', () => {
    it('should write src as data-embed-src', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        src: 'https://self-hosted.example/player',
      })

      expect(element.getAttribute('data-embed-src')).toBe('https://self-hosted.example/player')
    })

    it('should build a placeholder from src alone, with no provider', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, { src: 'https://embed.example/abc' })

      expect(element.hasAttribute('data-embed-provider')).toBe(false)
      expect(element.getAttribute('data-embed-src')).toBe('https://embed.example/abc')
    })
  })

  it.todo('should write the full metadata as data-embed-* attributes', () => {
    // Pass every EmbedResolverResult field and assert the complete placeholder
    // markup: all data-embed-* attributes plus the fallback anchor.
  })
})

describeForEachParser('updateEmbedPlaceholder', (parseHtml) => {
  it('should write normalized metadata as data-embed-* attributes', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateEmbedPlaceholder(element, {
      src: 'https://embed.example/abc',
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

  it('should trim values and skip whitespace-only ones', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateEmbedPlaceholder(element, { title: '  Video title  ', author: '   ' })

    const expected = '<div data-embed-title="Video title"></div>'

    expect(element.outerHTML).toEqualHtml(expected)
  })
})

describeForEachParser('updateCitePlaceholder', (parseHtml) => {
  it('should write normalized fields as data-cite-* attributes', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateCitePlaceholder(element, {
      publisher: 'example.com',
      thumbnail: 'https://example.com/cover.jpg',
    })

    const expected = html`
      <div
        data-cite-publisher="example.com"
        data-cite-thumbnail="https://example.com/cover.jpg"
      >
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should not overwrite attributes already present on the element', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-cite-title', 'Resolver title')

    updateCitePlaceholder(element, { title: 'Enrichment title', publisher: 'example.com' })

    const expected = html`
      <div data-cite-title="Resolver title" data-cite-publisher="example.com"></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  // An enricher passing a whole API payload through would otherwise turn every key of it
  // into an attribute, and a key that is not a valid attribute name would throw.
  it('should ignore keys that are not cite fields', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateCitePlaceholder(element, {
      title: 'Post title',
      media_key: '0b043233:b33b79b8',
      'invalid name': 'value',
    } as Partial<CiteResolverResult>)

    expect(element.outerHTML).toEqualHtml('<div data-cite-title="Post title"></div>')
  })
})

describe('normalizeEmbedFields', () => {
  describe('src and url passthrough', () => {
    it('should pass src and url through without changing the protocol', () => {
      const value = {
        src: 'http://embed.example/abc',
        url: 'http://page.example/x',
      }
      const expected: Record<string, string | undefined> = {
        src: 'http://embed.example/abc',
        url: 'http://page.example/x',
      }

      expect(normalizeEmbedFields(value)).toEqual(expected)
    })
  })

  describe('thumbnail and avatar passthrough', () => {
    it('should pass thumbnail and avatar through unchanged', () => {
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
      const value = { thumbnail: 'data:image/png;base64,iVBORw0KGgo=' }

      expect(normalizeEmbedFields(value).thumbnail).toBe('data:image/png;base64,iVBORw0KGgo=')
    })

    // Safety is neutralizeUnsafeUrls' job (see its tests); normalizeEmbedFields only
    // normalizes, so unsafe URLs pass through here unchanged.
    it('should pass unsafe thumbnail and avatar urls through unchanged', () => {
      expect(normalizeEmbedFields({ thumbnail: 'javascript:alert(1)' }).thumbnail).toBe(
        'javascript:alert(1)',
      )
      expect(normalizeEmbedFields({ avatar: 'data:text/html,<script>1</script>' }).avatar).toBe(
        'data:text/html,<script>1</script>',
      )
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
        publisher: 'r/example',
        date: '2026-08-09',
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
        'publisher',
        'date',
        'duration',
      ])
    })
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

  it('should prefix attributes with the cite type', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'cite', {
      provider: 'ghost',
      url: 'https://example.com',
      title: 'Title',
    })

    expect(element.getAttribute('data-cite-provider')).toBe('ghost')
    expect(element.getAttribute('data-cite-url')).toBe('https://example.com')
    expect(element.getAttribute('data-cite-title')).toBe('Title')
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

  it('should trim surrounding whitespace from string values', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {
      title: '  Video title  ',
      author: '\n Channel name \t',
    })

    expect(element.getAttribute('data-embed-title')).toBe('Video title')
    expect(element.getAttribute('data-embed-author')).toBe('Channel name')
  })

  it('should skip whitespace-only fields', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'embed', {
      provider: 'youtube',
      title: '   ',
      description: '\n\t',
    })

    expect(element.getAttribute('data-embed-provider')).toBe('youtube')
    expect(element.hasAttribute('data-embed-title')).toBe(false)
    expect(element.hasAttribute('data-embed-description')).toBe(false)
  })

  it('should write only the non-empty fields when some are absent', () => {
    const document = parseHtml('<div></div>')
    const element = createPlaceholder(document, 'cite', {
      provider: 'ghost',
      url: 'https://example.com',
      title: '',
      icon: undefined,
      thumbnail: 'https://example.com/t.jpg',
    })

    expect(element.attributes.length).toBe(3)
    expect(element.hasAttribute('data-cite-title')).toBe(false)
    expect(element.hasAttribute('data-cite-icon')).toBe(false)
    expect(element.getAttribute('data-cite-thumbnail')).toBe('https://example.com/t.jpg')
  })

  it('should preserve values containing reserved characters verbatim', () => {
    const document = parseHtml('<div></div>')
    const value = 'https://example.com/p?a=1&b="2"&c=<x>'
    const element = createPlaceholder(document, 'cite', { url: value })

    expect(element.getAttribute('data-cite-url')).toBe(value)
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

describeForEachParser('createCitePlaceholder', (parseHtml) => {
  it('should write all fields and append a link labelled with the title', () => {
    const document = parseHtml('')
    const value: CiteResolverResult = {
      provider: 'ghost',
      url: 'https://example.com/post',
      title: 'Post title',
      description: 'Preview text',
      author: 'Author name',
      publisher: 'Publisher name',
      icon: 'https://example.com/favicon.ico',
      thumbnail: 'https://example.com/og-image.jpg',
    }
    const element = createCitePlaceholder(document, value)
    const expected = html`
      <div
        data-cite-provider="ghost"
        data-cite-description="Preview text"
        data-cite-author="Author name"
        data-cite-publisher="Publisher name"
        data-cite-url="https://example.com/post"
        data-cite-title="Post title"
        data-cite-icon="https://example.com/favicon.ico"
        data-cite-thumbnail="https://example.com/og-image.jpg"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should trim raw field values in attributes and the fallback link', () => {
    const document = parseHtml('')
    const value: CiteResolverResult = {
      provider: 'ghost',
      url: ' https://example.com/post ',
      title: '  Post title\n',
      description: ' Preview text ',
      author: '   ',
    }
    const element = createCitePlaceholder(document, value)
    const expected = html`
      <div
        data-cite-provider="ghost"
        data-cite-description="Preview text"
        data-cite-url="https://example.com/post"
        data-cite-title="Post title"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should pass http url, icon and thumbnail through without changing the protocol', () => {
    const document = parseHtml('')
    const value: CiteResolverResult = {
      provider: 'ghost',
      url: 'http://example.com/post',
      title: 'Post title',
      icon: 'http://example.com/favicon.ico',
      thumbnail: 'http://example.com/og-image.jpg',
    }
    const element = createCitePlaceholder(document, value)
    const expected = html`
      <div
        data-cite-provider="ghost"
        data-cite-url="http://example.com/post"
        data-cite-title="Post title"
        data-cite-icon="http://example.com/favicon.ico"
        data-cite-thumbnail="http://example.com/og-image.jpg"
      >
        <a href="http://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  // Safety is neutralizeUnsafeUrls' job (see its tests); the placeholder emits the
  // icon/thumbnail as-is and the later pass neutralizes any unsafe URL.
  it('should pass unsafe icon and thumbnail urls through unchanged', () => {
    const document = parseHtml('')
    const value: CiteResolverResult = {
      provider: 'ghost',
      url: 'https://example.com/post',
      title: 'Post title',
      icon: 'javascript:alert(1)',
      thumbnail: 'data:image/svg+xml;utf8,<svg/>',
    }
    const element = createCitePlaceholder(document, value)
    const expected = html`
      <div
        data-cite-provider="ghost"
        data-cite-url="https://example.com/post"
        data-cite-title="Post title"
        data-cite-icon="javascript:alert(1)"
        data-cite-thumbnail="data:image/svg+xml;utf8,<svg/>"
      >
        <a href="https://example.com/post">Post title</a>
      </div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })
})

describeForEachParser('declaredSize', (parseHtml) => {
  const stated: EmbedResolverResult = { provider: 'example', id: 'abc', src: 'https://x.test/abc' }

  const resolve = (
    resolver: { selector: string; extract: (element: Element) => unknown },
    value: string,
  ) => {
    const element = parseHtml(value).querySelector(resolver.selector)

    return element ? resolver.extract(element) : undefined
  }

  describe('a markup-keyed resolver', () => {
    it('should take the size the carrier declares by default', () => {
      const resolver = createMarkupEmbedResolver('div.player', () => stated)
      const value = html`<div class="player" width="640" height="360"></div>`
      const expected: EmbedResolverResult = { ...stated, width: 640, height: 360 }

      expect(resolve(resolver, value)).toEqual(expected)
    })

    it('should keep its own numbers when the declared size is refused', () => {
      const resolver = createMarkupEmbedResolver('div.player', () => ({ ...stated, height: 200 }), {
        declaredSize: false,
      })
      const value = html`<div class="player" width="640" height="360"></div>`
      const expected: EmbedResolverResult = { ...stated, height: 200 }

      expect(resolve(resolver, value)).toEqual(expected)
    })
  })

  describe('a url-keyed resolver', () => {
    it('should take the size the carrier declares by default', () => {
      const resolver = createUrlEmbedResolver(['x.test'], () => stated)
      const value = html`<iframe src="https://x.test/abc" width="640" height="360"></iframe>`
      const expected: EmbedResolverResult = { ...stated, width: 640, height: 360 }

      expect(resolve(resolver, value)).toEqual(expected)
    })

    it('should keep its own numbers when the declared size is refused', () => {
      const resolver = createUrlEmbedResolver(['x.test'], () => ({ ...stated, height: 200 }), {
        declaredSize: false,
      })
      const value = html`<iframe src="https://x.test/abc" width="640" height="360"></iframe>`
      const expected: EmbedResolverResult = { ...stated, height: 200 }

      expect(resolve(resolver, value)).toEqual(expected)
    })
  })
})

describeForEachParser('createGalleryPlaceholder', (parseHtml) => {
  it('should serialize items and wrap the full-size link, alt and caption in the fallback', () => {
    const value: GalleryResolverResult = {
      provider: 'wordpress',
      title: 'My trip',
      items: [
        {
          url: 'https://e.com/a.jpg',
          fullUrl: 'https://e.com/a-full.jpg',
          alt: 'Sunset',
          caption: 'Day one',
        },
        { url: 'https://e.com/b.jpg' },
      ],
    }
    const element = createGalleryPlaceholder(parseHtml(''), value)

    expect(element.getAttribute('data-gallery-provider')).toBe('wordpress')
    expect(element.getAttribute('data-gallery-title')).toBe('My trip')
    expect(JSON.parse(element.getAttribute('data-gallery-items') ?? '')).toEqual(value.items)

    const figures = element.querySelectorAll('figure')
    expect(figures.length).toBe(2)

    const link = figures[0].querySelector('a')
    expect(link?.getAttribute('href')).toBe('https://e.com/a-full.jpg')
    expect(link?.querySelector('img')?.getAttribute('src')).toBe('https://e.com/a.jpg')
    expect(figures[0].querySelector('img')?.getAttribute('alt')).toBe('Sunset')
    expect(figures[0].querySelector('figcaption')?.textContent).toBe('Day one')

    expect(figures[1].querySelector('a')).toBeNull()
    expect(figures[1].querySelector('img')?.getAttribute('src')).toBe('https://e.com/b.jpg')
  })

  it('should emit data-gallery-layout for a slideshow', () => {
    const element = createGalleryPlaceholder(parseHtml(''), {
      provider: 'wordpress',
      layout: 'slideshow',
      items: [{ url: 'https://e.com/a.jpg' }, { url: 'https://e.com/b.jpg' }],
    })

    expect(element.getAttribute('data-gallery-layout')).toBe('slideshow')
  })

  it('should omit optional attributes when unset', () => {
    const element = createGalleryPlaceholder(parseHtml(''), {
      provider: 'wordpress',
      items: [{ url: 'https://e.com/a.jpg' }, { url: 'https://e.com/b.jpg' }],
    })

    expect(element.hasAttribute('data-gallery-layout')).toBe(false)
    expect(element.hasAttribute('data-gallery-title')).toBe(false)
  })
})

describeForEachParser('rewriteGalleryItemUrls', (parseHtml) => {
  const withItems = (items: Array<Record<string, unknown>>): Element => {
    const element = parseHtml('').createElement('div')
    element.setAttribute('data-gallery-items', JSON.stringify(items))

    return element
  }

  it('should rewrite url and fullUrl via the callback and keep other fields', () => {
    const element = withItems([
      { url: 'https://e.com/a.jpg', fullUrl: 'https://e.com/full.jpg', alt: 'Alt', caption: 'Cap' },
    ])

    rewriteGalleryItemUrls(element, (url) => `proxied:${url}`)

    const [item] = JSON.parse(element.getAttribute('data-gallery-items') ?? '')
    expect(item).toMatchObject({
      url: 'proxied:https://e.com/a.jpg',
      fullUrl: 'proxied:https://e.com/full.jpg',
      alt: 'Alt',
      caption: 'Cap',
    })
  })

  it('should pass the field name so callers can apply a per-field policy', () => {
    const element = withItems([{ url: 'https://e.com/a.jpg', fullUrl: 'https://e.com/full.jpg' }])
    const keys: Array<string> = []

    rewriteGalleryItemUrls(element, (url, key) => {
      keys.push(key)

      return url
    })

    expect(keys).toEqual(['url', 'fullUrl'])
  })

  it('should leave the attribute untouched when the callback changes nothing', () => {
    const raw = JSON.stringify([{ url: 'https://e.com/a.jpg' }])
    const element = parseHtml('').createElement('div')
    element.setAttribute('data-gallery-items', raw)

    rewriteGalleryItemUrls(element, () => undefined)

    expect(element.getAttribute('data-gallery-items')).toBe(raw)
  })

  it('should skip non-string url values without throwing', () => {
    const element = withItems([{ url: 42 }])

    expect(() => rewriteGalleryItemUrls(element, (url) => `proxied:${url}`)).not.toThrow()

    const [item] = JSON.parse(element.getAttribute('data-gallery-items') ?? '')
    expect(item).toMatchObject({
      url: 42,
    })
  })

  it('should ignore malformed JSON and a non-array payload', () => {
    const malformed = parseHtml('').createElement('div')
    malformed.setAttribute('data-gallery-items', 'not json')
    const object = parseHtml('').createElement('div')
    object.setAttribute('data-gallery-items', '{"url":"https://e.com/a.jpg"}')

    rewriteGalleryItemUrls(malformed, () => 'changed')
    rewriteGalleryItemUrls(object, () => 'changed')

    expect(malformed.getAttribute('data-gallery-items')).toBe('not json')
    expect(object.getAttribute('data-gallery-items')).toBe('{"url":"https://e.com/a.jpg"}')
  })
})
