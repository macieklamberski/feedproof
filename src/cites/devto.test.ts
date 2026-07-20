import { describe, expect, it } from 'bun:test'
import { citeExtractor, describeForEachParser, html } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import {
  devtoLegacyPostCiteResolver,
  devtoLinkCiteResolver,
  devtoPostCiteResolver,
} from './devto.js'

describeForEachParser('devtoLinkCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, devtoLinkCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="crayons-card c-embed text-styles text-styles--secondary">
          <div class="c-embed__content">
            <div class="c-embed__cover">
              <a href="https://example.com/classes" class="c-link align-middle" rel="noopener noreferrer">
                <img alt="" src="https://media.example.com/cover.png" height="450" class="m-0" width="800" />
              </a>
            </div>
            <div class="c-embed__body">
              <h2 class="fs-xl lh-tight">
                <a href="https://example.com/classes" rel="noopener noreferrer" class="c-link">Page title</a>
              </h2>
              <p class="truncate-at-3">Preview text</p>
              <div class="color-secondary fs-s flex items-center">
                <img alt="favicon" class="c-embed__favicon m-0 mr-2 radius-0" src="https://media.example.com/favicon.png" width="32" height="32" />
                example.com
              </div>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/classes',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://media.example.com/favicon.png',
        thumbnail: 'https://media.example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page">Page title</a></h2>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/page',
        title: 'Page title',
        description: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should fall back to the cover link when the title has no href', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__cover"><a href="https://example.com/page"><img src="https://example.com/cover.png" /></a></div>
          <div class="c-embed__body">
            <h2>Page title</h2>
          </div>
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/page')
    })

    // Optional fields pass through raw; createPlaceholder trims every field when it
    // writes the attributes. Only the guard-checked title is trimmed in the resolver.
    it('should read the publisher from the text beside the favicon', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page">Page title</a></h2>
            <div class="color-secondary">
              <img class="c-embed__favicon" src="https://example.com/favicon.png" />
              example.com
            </div>
          </div>
        </div>
      `

      expect((await extract(value))?.publisher).toBe('example.com')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page"> Padded title </a></h2>
          </div>
        </div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no url is available', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2>Page title</h2>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <p>Preview text</p>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is only whitespace', async () => {
      const value = html`
        <div class="c-embed">
          <div class="c-embed__body">
            <h2><a href="https://example.com/page"> </a></h2>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('devtoPostCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, devtoPostCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a card published under an organization', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <a href="https://example.com/org/post" class="crayons-story__hidden-navigation-link">Page title</a>
            <div class="crayons-story__body crayons-story__body-full_post">
              <div class="crayons-story__top">
                <div class="crayons-story__meta">
                  <div class="crayons-story__author-pic">
                    <a class="crayons-logo crayons-logo--l" href="/org">
                      <img alt="Org logo" src="https://example.com/org.png" class="crayons-logo__image" />
                    </a>
                    <a href="/author" class="crayons-avatar crayons-avatar--s">
                      <img src="https://example.com/author.png" alt="author profile" class="crayons-avatar__image" />
                    </a>
                  </div>
                  <div>
                    <div>
                      <a href="/author" class="crayons-story__secondary fw-medium">Author name</a>
                      <span>
                        <span class="crayons-story__tertiary fw-normal"> for </span>
                        <a href="/org" class="crayons-story__secondary fw-medium">Org name</a>
                      </span>
                    </div>
                    <a href="https://example.com/org/post" class="crayons-story__tertiary fs-xs">
                      <time>Jul 14</time>
                    </a>
                  </div>
                </div>
              </div>
              <div class="crayons-story__indention">
                <h2 class="crayons-story__title crayons-story__title-full_post">
                  <a href="https://example.com/org/post" id="article-link-4142811">Page title</a>
                </h2>
              </div>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/org/post',
        title: 'Page title',
        description: undefined,
        author: 'Author name',
        publisher: 'Org name',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the publisher undefined for a card with no organization', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <a href="https://example.com/post" class="crayons-story__hidden-navigation-link">Page title</a>
            <div class="crayons-story__body">
              <div>
                <a href="/author" class="crayons-story__secondary fw-medium">Author name</a>
              </div>
              <h2 class="crayons-story__title"><a href="https://example.com/post">Page title</a></h2>
            </div>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/post',
        title: 'Page title',
        description: undefined,
        author: 'Author name',
        publisher: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the description from a context note', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <a
              href="https://example.com/post"
              class="crayons-article__context-note crayons-article__context-note__feed"
            >
              Context note text
            </a>
            <h2 class="crayons-story__title"><a href="https://example.com/post">Page title</a></h2>
          </div>
        </div>
      `

      expect((await extract(value))?.description).toBe('Context note text')
    })

    it('should read the description from a status preview when there is no context note', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <h2 class="crayons-story__title"><a href="https://example.com/post">Page title</a></h2>
            <div class="crayons-story__contentpreview">Status text</div>
          </div>
        </div>
      `

      expect((await extract(value))?.description).toBe('Status text')
    })

    it('should fall back to the title link when the navigation link is absent', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <h2 class="crayons-story__title"><a href="https://example.com/post">Page title</a></h2>
          </div>
        </div>
      `

      expect((await extract(value))?.url).toBe('https://example.com/post')
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <h2 class="crayons-story__title"><a href="https://example.com/post"> Padded title </a></h2>
          </div>
        </div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the title link is missing', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-story ">
            <div class="crayons-story__body"></div>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a removed post', async () => {
      const value = html`
        <div class="ltag__link--embedded">
          <div class="crayons-card my-2 p-4">
            <p class="color-base-60">Post not found or has been removed.</p>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('devtoLegacyPostCiteResolver', (parseHtml) => {
  const extract = citeExtractor(parseHtml, devtoLegacyPostCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="/author" class="ltag__link__link">
            <div class="ltag__link__pic">
              <img src="https://example.com/author.jpg" alt="author" />
            </div>
          </a>
          <a href="https://example.com/author/post" class="ltag__link__link">
            <div class="ltag__link__content">
              <h2>Page title</h2>
              <h3>Author name ・ Aug 25 '22</h3>
              <div class="ltag__link__taglist">
                <span class="ltag__link__tag">#git</span>
                <span class="ltag__link__tag">#security</span>
              </div>
            </div>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'devto',
        url: 'https://example.com/author/post',
        title: 'Page title',
        author: 'Author name',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should drop the reading time appended after the date', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="https://example.com/author/post" class="ltag__link__link">
            <div class="ltag__link__content">
              <h2>Page title</h2>
              <h3>Author name ・ Aug 25 '22 ・ 5 min read</h3>
              <div class="ltag__link__taglist"><span class="ltag__link__tag">#git</span></div>
            </div>
          </a>
        </div>
      `

      expect((await extract(value))?.author).toBe('Author name')
    })

    it('should leave the author undefined when the byline is missing', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="https://example.com/author/post" class="ltag__link__link">
            <div class="ltag__link__content"><h2>Page title</h2></div>
          </a>
        </div>
      `

      expect((await extract(value))?.author).toBeUndefined()
    })

    it('should trim surrounding whitespace from the title', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="https://example.com/author/post" class="ltag__link__link">
            <div class="ltag__link__content"><h2> Padded title </h2></div>
          </a>
        </div>
      `

      expect((await extract(value))?.title).toBe('Padded title')
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a Medium card sharing the same classes', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="https://medium.com/@author/post" class="ltag__link__link">
            <div class="ltag__link__content">
              <h2>Page title</h2>
              <h3>Author name</h3>
              <span class="ltag__link__servicename">Medium</span>
            </div>
          </a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a removed post', async () => {
      const value = html`
        <div class="ltag__link">
          <div class="ltag__link__content">
            <div class="missing"><h2>Post not found or has been removed.</h2></div>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div class="ltag__link">
          <a href="https://example.com/author/post" class="ltag__link__link">
            <div class="ltag__link__content"><h3>Author name ・ Aug 25 '22</h3></div>
          </a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
