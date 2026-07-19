import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { BookmarkResolverResult } from '../types.js'
import { ghostBookmarkResolver } from './ghost.js'

describeForEachParser('ghostBookmarkResolver', (parseHtml) => {
  const extract = async (value: string): Promise<BookmarkResolverResult | undefined> => {
    const element = parseHtml(value).querySelector(ghostBookmarkResolver.selector)
    return element ? await ghostBookmarkResolver.extract(element) : undefined
  }

  describe('happy paths', () => {
    // The author and publisher classes are reversed on purpose: Ghost's renderer puts
    // the publisher in .kg-bookmark-author and the author in .kg-bookmark-publisher.
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title">Post title</div>
              <div class="kg-bookmark-description">Preview text</div>
              <div class="kg-bookmark-metadata">
                <img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="" />
                <span class="kg-bookmark-author">Publisher name</span>
                <span class="kg-bookmark-publisher">Author name</span>
              </div>
            </div>
            <div class="kg-bookmark-thumbnail">
              <img src="https://example.com/og-image.jpg" />
            </div>
          </a>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        author: 'Author name',
        publisher: 'Publisher name',
        icon: 'https://example.com/favicon.ico',
        thumbnail: 'https://example.com/og-image.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only title and href are present', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title">Post title</div>
            </div>
          </a>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: undefined,
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return raw url and icon (hygiene is applied by the placeholder builder)', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="http://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title">T</div>
              <div class="kg-bookmark-metadata">
                <img class="kg-bookmark-icon" src="http://example.com/i.ico" alt="" />
              </div>
            </div>
          </a>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'http://example.com/post',
        title: 'T',
        icon: 'http://example.com/i.ico',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should map the figcaption to the caption field', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title">Post title</div>
              <div class="kg-bookmark-description">Preview text</div>
            </div>
          </a>
          <figcaption>My note about why this link matters</figcaption>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        caption: 'My note about why this link matters',
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Ghost >= 5.87 tidies bookmark cards in its RSS pipeline: icon, thumbnail and
    // metadata are removed and the description is wrapped in <small>.
    it('should extract the slimmed RSS card shape', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title">Post title</div>
              <div class="kg-bookmark-description"><small>Preview text</small></div>
            </div>
          </a>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: 'Preview text',
        author: undefined,
        publisher: undefined,
        icon: undefined,
        thumbnail: undefined,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Optional fields pass through raw; createBookmarkPlaceholder trims every field
    // when it writes the attributes. Only the guard-checked title is trimmed here.
    it('should trim the title and pass optional text fields through raw', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content">
              <div class="kg-bookmark-title"> Post title </div>
              <div class="kg-bookmark-description"> Preview text </div>
              <div class="kg-bookmark-metadata">
                <span class="kg-bookmark-author"> Publisher name </span>
                <span class="kg-bookmark-publisher"> Author name </span>
              </div>
            </div>
          </a>
        </figure>
      `
      const expected: BookmarkResolverResult = {
        provider: 'ghost',
        url: 'https://example.com/post',
        title: 'Post title',
        description: ' Preview text ',
        author: ' Author name ',
        publisher: ' Publisher name ',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when href is missing', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container">
            <div class="kg-bookmark-title">Post title</div>
          </a>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is missing', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-content"></div>
          </a>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when title is whitespace-only', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="https://example.com/post">
            <div class="kg-bookmark-title"> </div>
          </a>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when href is empty', async () => {
      const value = html`
        <figure class="kg-card kg-bookmark-card">
          <a class="kg-bookmark-container" href="">
            <div class="kg-bookmark-title">Post title</div>
          </a>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no bookmark card is present', async () => {
      const value = html`<p>Regular content</p>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})
