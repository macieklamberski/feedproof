import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { nodebbCiteResolver } from './nodebb.js'

describeForEachParser('nodebbCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, nodebbCiteResolver)

  describe('happy paths', () => {
    it('should extract all fields from a complete card', async () => {
      const value = html`
        <div class="card col-md-9 col-lg-6 position-relative link-preview p-0">
          <a href="https://example.com/post" title="Page title">
            <img src="https://cdn.example.com/cover.png" class="card-img-top not-responsive" alt="Link Preview Image" />
          </a>
          <div class="card-body">
            <h5 class="card-title">
              <a class="text-decoration-none" href="https://example.com/post">Page title</a>
            </h5>
            <p class="card-text line-clamp-3">Preview text</p>
          </div>
          <a href="https://example.com/post" class="card-footer text-body-secondary small">
            <img src="https://example.com/favicon.svg" alt="favicon" class="not-responsive" />
            <p class="d-inline-block text-truncate mb-0">Example <span class="text-secondary">(example.com)</span></p>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'nodebb',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'Example',
        icon: 'https://example.com/favicon.svg',
        thumbnail: 'https://cdn.example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave optional fields undefined when only the title link is present', async () => {
      const value = html`
        <div class="card link-preview">
          <div class="card-body">
            <h5 class="card-title"><a href="https://example.com/post">Page title</a></h5>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'nodebb',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the publisher name without the domain span', async () => {
      const value = html`
        <div class="card link-preview">
          <div class="card-body">
            <h5 class="card-title"><a href="https://example.com/post">Page title</a></h5>
          </div>
          <a href="https://example.com/post" class="card-footer">
            <p class="d-inline-block text-truncate mb-0">Example <span>(example.com)</span></p>
          </a>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'nodebb',
        url: 'https://example.com/post',
        title: 'Page title',
        publisher: 'Example',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the image anchor when the title has no link', async () => {
      const value = html`
        <div class="card link-preview">
          <a href="https://example.com/post"><img class="card-img-top" src="https://cdn.example.com/cover.png" /></a>
          <div class="card-body">
            <h5 class="card-title">Page title</h5>
          </div>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'nodebb',
        url: 'https://example.com/post',
        title: 'Page title',
        thumbnail: 'https://cdn.example.com/cover.png',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no link is present', async () => {
      const value = html`
        <div class="card link-preview">
          <div class="card-body">
            <h5 class="card-title">Page title</h5>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <div class="card link-preview">
          <div class="card-body">
            <p class="card-text">Preview text</p>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
