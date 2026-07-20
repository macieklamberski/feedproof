import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { hatenaCiteResolver } from './hatena.js'

describeForEachParser('hatenaCiteResolver', (parseHtml) => {
  const extract = async (value: string): Promise<CiteResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(hatenaCiteResolver.selector)
    return element ? await hatenaCiteResolver.extract(element) : undefined
  }

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
          <cite class="hatena-citation"><a href="https://example.com/spirit/">example.com</a></cite>
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
          <cite class="hatena-citation"><a href="https://example.com/entry">example.com</a></cite>
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
        publisher: undefined,
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
          <cite class="hatena-citation"><a href="https://example.com/current">example.com</a></cite>
        </p>
      `

      expect((await extract(value))?.url).toBe('https://example.com/current')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <p>
          <iframe
            src="https://hatenablog-parts.com/embed?url=https%3A%2F%2Fexample.com%2Fa"
            title=" Padded title "
            class="embed-card"
          ></iframe>
        </p>
      `

      expect((await extract(value))?.title).toBe('Padded title')
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

    it('should not match a paragraph without an embed card', async () => {
      const value = html`
        <p>
          <cite class="hatena-citation"><a href="https://example.com/a">example.com</a></cite>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
