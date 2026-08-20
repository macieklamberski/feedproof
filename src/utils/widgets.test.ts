import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult, EmbedResolverResult } from '../types.js'
import {
  createCitePlaceholder,
  createEmbedPlaceholder,
  createMarkupEmbedResolver,
  createPlaceholder,
  createUrlEmbedResolver,
  normalizeEmbedFields,
  updateCitePlaceholder,
  updateEmbedPlaceholder,
} from './widgets.js'

describeForEachParser('createEmbedPlaceholder', (parseHtml) => {
  it('should leave the placeholder empty', () => {
    const document = parseHtml('')
    const element = createEmbedPlaceholder(document, {
      provider: 'custom',
      src: 'https://embed.example/abc',
      url: 'https://canonical.example/abc',
    })

    expect(element.childNodes.length).toBe(0)
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

  describe('a size and a shape together', () => {
    it('should write the ratio when nothing measured the player', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        src: 'https://embed.example/abc',
        ratio: '16/9',
      })

      const expected = html`
        <div
          data-embed-src="https://embed.example/abc"
          data-embed-ratio="16/9"
        >
        </div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })

    it('should drop the ratio when the metadata also states a size', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        src: 'https://embed.example/abc',
        width: 560,
        height: 315,
        ratio: '16/9',
      })

      const expected = html`
        <div
          data-embed-src="https://embed.example/abc"
          data-embed-width="560"
          data-embed-height="315"
        >
        </div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })

    it('should drop the ratio when the metadata states a height alone', () => {
      const document = parseHtml('')
      const element = createEmbedPlaceholder(document, {
        src: 'https://embed.example/abc',
        height: 200,
        ratio: '16/9',
      })

      const expected = html`
        <div
          data-embed-src="https://embed.example/abc"
          data-embed-height="200"
        >
        </div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })
  })

  it.todo('should write the full metadata as data-embed-* attributes', () => {
    // Pass every EmbedResolverResult field and assert the complete placeholder markup.
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

  // A later write means what it sets. This is what lets an enrichment pass, the platform's own API
  // answering about this exact embed, replace whatever a resolver read off the markup.
  it('should overwrite attributes already present on the element', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-embed-title', 'Original title')

    updateEmbedPlaceholder(element, {
      title: 'Replacement title',
      author: 'Channel name',
    })

    const expected = html`
      <div
        data-embed-title="Replacement title"
        data-embed-author="Channel name"
      ></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should leave an attribute alone when the write does not set it', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-embed-title', 'Original title')

    updateEmbedPlaceholder(element, { author: 'Channel name' })

    const expected = html`
      <div
        data-embed-title="Original title"
        data-embed-author="Channel name"
      ></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should trim values and skip whitespace-only ones', () => {
    const document = parseHtml('')
    const element = document.createElement('div')

    updateEmbedPlaceholder(element, {
      title: '  Video title  ',
      author: '   ',
    })

    const expected = '<div data-embed-title="Video title"></div>'

    expect(element.outerHTML).toEqualHtml(expected)
  })

  // Width and height are one measurement and land as one. Written as independent attributes
  // they once split: an enricher's width joined a resolver's fixed height and 560x190 described
  // a box nobody measured. An incoming size now clears the slot and lands whole.
  it('should replace the element size whole with the incoming pair', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-embed-height', '190')

    updateEmbedPlaceholder(element, {
      width: 560,
      height: 315,
    })

    const expected = html`
      <div
        data-embed-width="560"
        data-embed-height="315"
      ></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  // A lone incoming height is still the whole size: it must not gain the width the element had.
  it('should replace a pair with a lone incoming height, not merge them', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-embed-width', '640')
    element.setAttribute('data-embed-height', '360')

    updateEmbedPlaceholder(element, { height: 190 })

    const expected = '<div data-embed-height="190"></div>'

    expect(element.outerHTML).toEqualHtml(expected)
  })

  // A size and a shape never sit side by side. Whichever arrives later takes the slot whole,
  // since a later write is a better-informed one, and dimensions beat a ratio when both arrive at
  // once because they are the more specific claim.
  describe('a size arriving beside a shape', () => {
    it('should replace the ratio with a size the enrichment brings', () => {
      const document = parseHtml('')
      const element = document.createElement('div')
      element.setAttribute('data-embed-ratio', '16/9')

      updateEmbedPlaceholder(element, {
        width: 560,
        height: 315,
      })

      const expected = html`
        <div
          data-embed-width="560"
          data-embed-height="315"
        >
        </div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })

    it('should replace a stated size with a ratio the enrichment brings', () => {
      const document = parseHtml('')
      const element = document.createElement('div')
      element.setAttribute('data-embed-height', '200')

      updateEmbedPlaceholder(element, {
        ratio: '16/9',
        title: 'Episode title',
      })

      const expected = html`
        <div
          data-embed-ratio="16/9"
          data-embed-title="Episode title"
        >
        </div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })

    it('should keep the dimensions when a write brings both dimensions and a ratio', () => {
      const document = parseHtml('')
      const element = document.createElement('div')

      updateEmbedPlaceholder(element, {
        width: 640,
        height: 360,
        ratio: '16/9',
      })

      const expected = html`
        <div
          data-embed-width="640"
          data-embed-height="360"
        ></div>
      `

      expect(element.outerHTML).toEqualHtml(expected)
    })
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

  it('should overwrite attributes already present on the element', () => {
    const document = parseHtml('')
    const element = document.createElement('div')
    element.setAttribute('data-cite-title', 'Resolver title')

    updateCitePlaceholder(element, { title: 'Enrichment title', publisher: 'example.com' })

    const expected = html`
      <div
        data-cite-title="Enrichment title"
        data-cite-publisher="example.com"
      ></div>
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
      const expected = 'data:image/png;base64,iVBORw0KGgo='

      expect(normalizeEmbedFields(value).thumbnail).toBe(expected)
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
        thumbnailFallback: 'https://cdn.example/t-small.jpg',
        width: 1,
        height: 2,
        ratio: '16/9',
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
        'thumbnail-fallback',
        'width',
        'height',
        'ratio',
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
      ></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })

  it('should trim raw field values in attributes and the link', () => {
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
      ></div>
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
      ></div>
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
      ></div>
    `

    expect(element.outerHTML).toEqualHtml(expected)
  })
})

describeForEachParser('declaredSize', (parseHtml) => {
  const base: EmbedResolverResult = { provider: 'example', id: 'abc', src: 'https://x.test/abc' }

  const resolve = (
    resolver: { selector: string; extract: (element: Element) => unknown },
    value: string,
  ) => {
    const element = parseHtml(value).querySelector(resolver.selector)

    return element ? resolver.extract(element) : undefined
  }

  describe('a markup-keyed resolver', () => {
    it('should take the size the carrier declares by default', () => {
      const resolver = createMarkupEmbedResolver('div.player', () => base)
      const value = html`
        <div
          class="player"
          width="640"
          height="360"
        ></div>
      `
      const expected: EmbedResolverResult = { ...base, width: 640, height: 360 }

      expect(resolve(resolver, value)).toEqual(expected)
    })

    it('should keep its own numbers when the declared size is refused', () => {
      const resolver = createMarkupEmbedResolver('div.player', () => ({ ...base, height: 200 }), {
        declaredSize: false,
      })
      const value = html`
        <div
          class="player"
          width="640"
          height="360"
        ></div>
      `
      const expected: EmbedResolverResult = { ...base, height: 200 }

      expect(resolve(resolver, value)).toEqual(expected)
    })
  })

  describe('a url-keyed resolver', () => {
    it('should take the size the carrier declares by default', () => {
      const resolver = createUrlEmbedResolver(['x.test'], () => base)
      const value = html`
        <iframe
          src="https://x.test/abc"
          width="640"
          height="360"
        ></iframe>
      `
      const expected: EmbedResolverResult = { ...base, width: 640, height: 360 }

      expect(resolve(resolver, value)).toEqual(expected)
    })

    it('should keep its own numbers when the declared size is refused', () => {
      const resolver = createUrlEmbedResolver(['x.test'], () => ({ ...base, height: 200 }), {
        declaredSize: false,
      })
      const value = html`
        <iframe
          src="https://x.test/abc"
          width="640"
          height="360"
        ></iframe>
      `
      const expected: EmbedResolverResult = { ...base, height: 200 }

      expect(resolve(resolver, value)).toEqual(expected)
    })
  })

  // A ratio and a pixel size describe different things, so a result must never end up holding
  // one of each: a resolver that infers 16/9 and a carrier that states a 400px height are
  // talking past each other. Every combination below asks the same question: can the result end
  // up holding one number from each side?
  // The order in which a size is decided, top to bottom. Each group is one tier, and a case in a
  // lower group only applies once every higher one found nothing.
  describe('what decides the size', () => {
    const withRatio: EmbedResolverResult = { ...base, ratio: '16/9' }
    const withHeight: EmbedResolverResult = { ...base, height: 300 }

    const build = (result: EmbedResolverResult, markup: string) => {
      return resolve(
        createMarkupEmbedResolver('div.player', () => result),
        markup,
      )
    }

    // The carrier is the publisher stating the box they laid out for the player they actually
    // embedded, so what it declares on itself replaces whatever the resolver said, dimensions first
    // and a ratio of its own next. A carrier that states nothing leaves the resolver alone.
    describe('the carrier outranks the resolver', () => {
      it('should let the carrier overrule the height the resolver states', () => {
        const value = html`
          <div
            class="player"
            height="400"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, height: 400 }

        expect(build(withHeight, value)).toEqual(expected)
      })

      it('should drop the resolver ratio when the carrier states a height alone', () => {
        const value = html`
          <div
            class="player"
            height="400"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, height: 400 }

        expect(build(withRatio, value)).toEqual(expected)
      })

      it('should drop the resolver ratio when the carrier states a width alone', () => {
        const value = html`
          <div
            class="player"
            width="640"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, width: 640 }

        expect(build(withRatio, value)).toEqual(expected)
      })

      it('should take the carrier pair whole when it states both', () => {
        const value = html`
          <div
            class="player"
            width="640"
            height="360"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, width: 640, height: 360 }

        expect(build(withRatio, value)).toEqual(expected)
      })

      it('should replace the pair from an inline style', () => {
        const value = html`
          <div
            class="player"
            style="height: 400px"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, height: 400 }

        expect(build(withRatio, value)).toEqual(expected)
      })

      it('should replace the pair from data-image-dimensions', () => {
        const value = html`
          <div
            class="player"
            data-image-dimensions="640x360"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, width: 640, height: 360 }

        expect(build(withRatio, value)).toEqual(expected)
      })

      // A ratio the carrier declares on itself is still the carrier speaking, so it replaces the
      // resolver's the same as a declared width or height would.
      it('should replace the ratio from one declared on the carrier itself', () => {
        const value = '<div class="player" style="aspect-ratio: 4/3"></div>'
        const expected: EmbedResolverResult = { ...base, ratio: '4/3' }

        expect(build(withRatio, value)).toEqual(expected)
      })
    })

    // Whatever the resolver stated stands when the carrier states nothing on itself. That covers
    // a measured height, a platform ratio and a corpus-typical default alike: the pipeline does
    // not tell them apart, and only the carrier itself ranks above the resolver.
    describe('the resolver outranks an ancestor', () => {
      it('should keep the resolver ratio when the carrier states nothing', () => {
        const value = html`<div class="player"></div>`

        expect(build(withRatio, value)).toEqual(withRatio)
      })

      it('should keep the resolver height when the carrier states nothing', () => {
        const value = html`<div class="player"></div>`

        expect(build(withHeight, value)).toEqual(withHeight)
      })

      // An ancestor's responsive wrapper says what shape the box around the player is, not what
      // shape the player is. Read at full depth this once turned a platform's own 9:16 into a
      // theme's blanket 16:9.
      it('should keep the resolver ratio over one inferred from an ancestor wrapper', () => {
        const value = html`
          <div style="padding-bottom: 50%">
            <div class="player"></div>
          </div>
        `
        const expected: EmbedResolverResult = { ...base, ratio: '16/9' }

        expect(build(withRatio, value)).toEqual(expected)
      })

      it('should keep the resolver height over a ratio inferred from an ancestor wrapper', () => {
        const value = html`
          <div style="padding-bottom: 50%">
            <div class="player"></div>
          </div>
        `

        expect(build(withHeight, value)).toEqual(withHeight)
      })
    })

    // The wrapper is the weakest source, so it speaks only when nobody else did: the resolver
    // stated no size and the carrier declares nothing on itself. That is the everyday responsive
    // embed, a sizeless video iframe inside a theme's padding-bottom wrapper.
    describe('an ancestor fills in when nothing else states a size', () => {
      it('should take the wrapper ratio when the resolver states no size', () => {
        const value = html`
          <div style="padding-bottom: 56.25%">
            <div class="player"></div>
          </div>
        `
        const expected: EmbedResolverResult = { ...base, ratio: '100/56.25' }

        expect(build(base, value)).toEqual(expected)
      })

      it('should state no size when there is no wrapper either', () => {
        const value = html`<div class="player"></div>`

        expect(build(base, value)).toEqual(base)
      })
    })

    // A size is one measurement from one source. The carrier naming a width and nothing else does
    // not get the resolver's height to complete it: 640 by 300 is a ratio no one stated.
    describe('a size comes from one source', () => {
      it('should not pair the resolver height with a width the carrier states', () => {
        const value = html`
          <div
            class="player"
            width="640"
          ></div>
        `
        const expected: EmbedResolverResult = { ...base, width: 640 }

        expect(build(withHeight, value)).toEqual(expected)
      })
    })

    // A size the carrier states in a form nothing can read is the same as stating none, so the
    // resolver's own pair survives intact.
    describe('a size the carrier states unreadably', () => {
      it('should keep the ratio for a fluid width and an automatic height', () => {
        const value = html`
          <div
            class="player"
            width="100%"
            height="auto"
          ></div>
        `

        expect(build(withRatio, value)).toEqual(withRatio)
      })
    })
  })
})
