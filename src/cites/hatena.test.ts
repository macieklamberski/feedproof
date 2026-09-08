import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { hatenaCiteResolver } from './hatena.js'

describeForEachParser('hatenaCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, hatenaCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fspirit%2F"
            title="Page title"
            class="embed-card embed-webcard"
            scrolling="no"
            frameborder="0"
            loading="lazy"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/spirit/">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/spirit/',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a blogcard the same way as a webcard', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fentry"
            title="Page title"
            class="embed-card embed-blogcard"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/entry">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/entry',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Of 756 corpus feeds framing the card renderer, 72 spell something other than
    // `embed-card`, so the host is what identifies the card rather than the class.
    it('should extract a card whose iframe carries no class', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fentry"
            title="Page title"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/entry">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/entry',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a card spelling its class hatenablogcard', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fentry"
            title="Page title"
            class="hatenablogcard"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/entry">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/entry',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract a card whose src is protocol-relative', async () => {
      const value = html`
        <p>
          <iframe
            src="//hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fentry"
            title="Page title"
            class="embed-card"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/entry">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/entry',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should decode the url from the iframe when the citation is missing', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1"
            title="Page title"
            class="embed-card embed-webcard"
          ></iframe>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/a?b=1',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the citation href over the encoded iframe url', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fstale"
            title="Page title"
            class="embed-card"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/current">example.com</a>
          </cite>
        </p>
      `
      const expected: CiteResolverResult = {
        provider: 'hatena',
        url: 'https://example.com/current',
        title: 'Page title',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the iframe has no title', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fa"
            class="embed-card"
          ></iframe>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no url can be recovered', async () => {
      const value = html`
        <p>
          <iframe src="https://hatenablog-parts.com/embed" title="Page title" class="embed-card"></iframe>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the iframe src cannot be parsed', async () => {
      const value = html`
        <p>
          <iframe src="http://[" title="Page title" class="embed-card"></iframe>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign player carrying the card class', async () => {
      const value = html`
        <p>
          <iframe
            src="https://cdn.other.test/player?url=https%3A%2F%2Fexample.com%2Fvideo"
            title="A video"
            class="embed-card"
          ></iframe>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host naming the card renderer in its path', async () => {
      const value = html`
        <p>
          <iframe
            src="https://evil.test/hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fvideo"
            title="A video"
          ></iframe>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the iframe states no src', async () => {
      const value = html`
        <p>
          <iframe
            title="Page title"
            class="embed-card"
          ></iframe>
          <cite class="hatena-citation">
            <a href="https://example.com/entry">example.com</a>
          </cite>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a paragraph without an embed card', async () => {
      const value = html`
        <p>
          <cite class="hatena-citation">
            <a href="https://example.com/a">example.com</a>
          </cite>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
