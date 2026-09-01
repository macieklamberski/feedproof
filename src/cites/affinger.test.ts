import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, resolverExtractor } from '../tests.js'
import { convertCiteCards } from '../transforms/dom/convertCiteCards.js'
import type { CiteResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { affingerCiteResolver } from './affinger.js'

describeForEachParser('affingerCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, affingerCiteResolver)

  const transform = (value: string) => {
    const context: TransformContext = {
      ...baseContext,
      widgetResolvers: [{ kind: 'cite', ...affingerCiteResolver }],
    }

    return applyDomTransforms(parseHtml(value), [convertCiteCards(context)])
  }

  describe('happy paths', () => {
    it('should extract all fields from an external card', async () => {
      const value = html`
        <a class="st-cardlink" href="https://example.com/page" rel="nofollow noopener" target="_blank">
          <div class="kanren st-cardbox st-cardbox-ex">
            <dl class="clearfix">
              <dt class="st-card-img">
                <img data-src="https://example.com/shot.png" alt="" width="300" height="300" />
              </dt>
              <dd>
                <h5 class="st-cardbox-t">Page title</h5>
                <div class="st-card-excerpt smanone">
                  <p>Preview text</p>
                </div>
                <p class="st-cardbox-site">
                  <span class="st-cardbox-favicon">
                    <img data-src="https://www.google.com/s2/favicons?domain=example.com" width="16" height="16" alt="" />
                  </span>
                  <span class="st-cardbox-host">example.com</span>
                </p>
              </dd>
            </dl>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/page',
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        icon: 'https://www.google.com/s2/favicons?domain=example.com',
        thumbnail: 'https://example.com/shot.png',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an unwrapped old-shortcode card', async () => {
      const value = html`
        <div class="kanren st-cardbox">
          <dl class="clearfix">
            <dt>
              <a href="https://example.com/post">
                <img width="300" height="204" src="https://example.com/cover.jpg" class="attachment-300x300 size-300x300 wp-post-image" alt="" />
              </a>
            </dt>
            <dd>
              <h5 class="st-cardbox-t">
                <a href="https://example.com/post">Page title</a>
              </h5>
              <div class="smanone">
                <p>Preview text</p>
              </div>
              <p class="cardbox-more">
                <a href="https://example.com/post">More</a>
              </p>
            </dd>
          </dl>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        thumbnail: 'https://example.com/cover.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should extract an internal card, which carries no host or favicon', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink st-embed-cardlink">
          <div class="kanren st-cardbox">
            <dl class="clearfix">
              <dt class="st-card-img">
                <img src="https://example.com/cover.webp" />
              </dt>
              <dd>
                <p class="st-cardbox-t">Page title</p>
                <div class="st-card-excerpt smanone">
                  <p>Preview text</p>
                </div>
              </dd>
            </dl>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
        thumbnail: 'https://example.com/cover.webp',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should read the title from a p element as well as an h5', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <p class="st-cardbox-t">Page title</p>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read an image from src when the lazy attribute is absent', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <dt class="st-card-img">
              <img src="https://example.com/cover.webp" />
            </dt>
            <h5 class="st-cardbox-t">Page title</h5>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
        thumbnail: 'https://example.com/cover.webp',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the label badge as the caption', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <div class="st-cardbox-label">
              <span class="st-cardbox-label-text">Recommended</span>
            </div>
            <h5 class="st-cardbox-t">Page title</h5>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
        caption: 'Recommended',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the description from a smanone2 div without the more-link text', async () => {
      const value = html`
        <div class="kanren st-cardbox">
          <dl class="clearfix">
            <dd>
              <h5 class="st-cardbox-t">
                <a href="https://example.com/post">Page title</a>
              </h5>
              <div class="smanone2">
                <p>Preview text</p>
                <p class="cardbox-more">
                  <a href="https://example.com/post">More</a>
                </p>
              </div>
            </dd>
          </dl>
        </div>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
        description: 'Preview text',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should tolerate the literal undefined class the theme leaks', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox st-cardbox-ex undefined">
            <h5 class="st-cardbox-t">Page title</h5>
          </div>
        </a>
      `
      const expected: CiteResolverResult = {
        provider: 'affinger',
        url: 'https://example.com/post',
        title: 'Page title',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the related-posts listing', async () => {
      const value = html`
        <div class="kanren" data-st-load-more-id="3519e768">
          <dl class="clearfix">
            <dt>
              <a href="https://example.com/one">
                <img src="https://example.com/one.webp" />
              </a>
            </dt>
            <dd>
              <h5 class="kanren-t">
                <a href="https://example.com/one">One</a>
              </h5>
            </dd>
          </dl>
          <dl class="clearfix">
            <dt>
              <a href="https://example.com/two">
                <img src="https://example.com/two.webp" />
              </a>
            </dt>
            <dd>
              <h5 class="kanren-t">
                <a href="https://example.com/two">Two</a>
              </h5>
            </dd>
          </dl>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the header card grid', async () => {
      const value = html`
        <div class="st-cardlink-card st-cardlink-column-4">
          <a class="st-cardlink-card-link" href="https://example.com/page">
            <img class="st-cardlink-img" src="https://example.com/cover.webp" />
            <span>Page title</span>
          </a>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the card has no link', async () => {
      const value = html`
        <div class="kanren st-cardbox">
          <h5 class="st-cardbox-t">Page title</h5>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for the link-less callout box', async () => {
      const value = html`
        <div class="st-cardbox">
          <p>Callout paragraph one.</p>
          <p>Callout paragraph two.</p>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the title is missing', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <div class="st-card-excerpt">
              <p>Preview text</p>
            </div>
          </div>
        </a>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('through convertCiteCards', () => {
    it('should replace the wrapping anchor along with the card', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <h5 class="st-cardbox-t">Page title</h5>
          </div>
        </a>
      `
      const expected = html`
        <div
          data-cite-title="Page title"
          data-cite-url="https://example.com/post"
          data-cite-provider="affinger"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    // A left-behind anchor only misbehaves once the output is reparsed, which is what a
    // second run does. This is the case that pins the wrapping-anchor match.
    it('should be idempotent', async () => {
      const value = html`
        <a href="https://example.com/post" class="st-cardlink">
          <div class="kanren st-cardbox">
            <h5 class="st-cardbox-t">Page title</h5>
          </div>
        </a>
      `
      const once = await transform(value)

      expect(await transform(once)).toEqualHtml(once)
    })

    it('should leave the related-posts listing in place', async () => {
      const value = html`
        <div class="kanren" data-st-load-more-id="3519e768">
          <dl class="clearfix">
            <dd>
              <h5 class="kanren-t">
                <a href="https://example.com/one">One</a>
              </h5>
            </dd>
          </dl>
        </div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })
  })
})
