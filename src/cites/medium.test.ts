import { describe, expect, it } from 'bun:test'
import { baseContext, citeExtractor, describeForEachParser, html } from '../tests.js'
import { convertCiteCards } from '../transforms/dom/convertCiteCards.js'
import type { CiteResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { mediumCiteResolver } from './medium.js'

describeForEachParser('mediumCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, mediumCiteResolver)

  const transform = (value: string) => {
    const context: TransformContext = { ...baseContext, citeResolvers: [mediumCiteResolver] }

    return applyDomTransforms(parseHtml(value), [convertCiteCards(context)])
  }

  describe('happy paths', () => {
    it('should extract all fields from a wrapped card', async () => {
      const value = html`
        <div class="graf graf--mixtapeEmbed">
          <a
            href="https://example.com/page"
            class="markup--anchor markup--mixtapeEmbed-anchor"
            title="https://example.com/page"
          >
            <strong class="markup--strong markup--mixtapeEmbed-strong">Page title</strong>
            <br />
            <em class="markup--em markup--mixtapeEmbed-em">Preview text</em>example.com
          </a>
          <a
            href="https://example.com/page"
            class="js-mixtapeImage mixtapeImage u-ignoreBlock"
          >
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'medium',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the thumbnail from the image anchor background', async () => {
      const value = html`
        <div class="graf graf--mixtapeEmbed">
          <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
            <strong>Page title</strong>
          </a>
          <a
            href="https://example.com/page"
            class="js-mixtapeImage mixtapeImage"
            style="background-image: url(https://example.com/cover.jpg);"
          >
          </a>
        </div>
      `

      expect((await extract(value))?.thumbnail).toBe('https://example.com/cover.jpg')
    })

    it('should leave the thumbnail undefined when the image anchor is empty', async () => {
      const value = html`
        <div class="graf graf--mixtapeEmbed">
          <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
            <strong>Page title</strong>
          </a>
          <a href="https://example.com/page" class="js-mixtapeImage mixtapeImage mixtapeImage--empty"></a>
        </div>
      `

      expect((await extract(value))?.thumbnail).toBeUndefined()
    })

    it('should extract a bare anchor, the shape exported archives keep', async () => {
      const value = html`
        <a
          href="https://gist.example.com/user"
          class="markup--anchor markup--mixtapeEmbed-anchor"
          title="https://gist.example.com/user"
        >
          <strong>Page title</strong>
          <br />
          <em>Preview text</em>gist.example.com
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'medium',
        url: 'https://gist.example.com/user',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'gist.example.com',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should keep the medium redirect url as it is, leaving unwrapping to the cleanUrlFn', async () => {
      const value = html`
        <a
          href="https://medium.com/r/?url=https%3A%2F%2Fexample.com%2Fpage"
          class="markup--mixtapeEmbed-anchor"
        >
          <strong>Page title</strong>
        </a>
      `

      expect((await extract(value))?.url).toBe(
        'https://medium.com/r/?url=https%3A%2F%2Fexample.com%2Fpage',
      )
    })

    it('should leave the publisher undefined when no host trails the description', async () => {
      const value = html`
        <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
          <strong>Page title</strong><em>Preview text</em>
        </a>
      `

      expect((await extract(value))?.publisher).toBeUndefined()
    })

    it('should leave the description undefined when the card carries only a title', async () => {
      const value = html`
        <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
          <strong>Page title</strong>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'medium',
        url: 'https://example.com/page',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title is missing', async () => {
      const value = html`
        <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
          <em>Preview text</em>example.com
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the image anchor on its own', async () => {
      const value = html`
        <a href="https://example.com/page" class="js-mixtapeImage mixtapeImage u-ignoreBlock"></a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an ordinary medium anchor', async () => {
      const value = html`
        <a href="https://example.com/page" class="markup--anchor markup--p-anchor">Some link</a>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('through convertCiteCards', () => {
    it('should replace the wrapper so no empty image anchor is left behind', async () => {
      const value = html`
        <div class="graf graf--mixtapeEmbed">
          <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
            <strong>Page title</strong><em>Preview text</em>example.com
          </a>
          <a href="https://example.com/page" class="js-mixtapeImage mixtapeImage u-ignoreBlock"></a>
        </div>
      `
      const result = await transform(value)

      expect(result).toContain('data-cite-provider="medium"')
      expect(result).not.toContain('mixtapeImage')
    })

    it('should emit one placeholder per wrapped card', async () => {
      const value = html`
        <div class="graf graf--mixtapeEmbed">
          <a href="https://example.com/one" class="markup--mixtapeEmbed-anchor">
            <strong>One</strong>
          </a>
          <a href="https://example.com/one" class="js-mixtapeImage mixtapeImage"></a>
        </div>
      `
      const result = await transform(value)

      expect((result.match(/data-cite-provider="/g) ?? []).length).toBe(1)
    })

    it('should be idempotent', async () => {
      const value = html`
        <a href="https://example.com/page" class="markup--mixtapeEmbed-anchor">
          <strong>Page title</strong>
        </a>
      `
      const once = await transform(value)

      expect(await transform(once)).toEqualHtml(once)
    })
  })
})
