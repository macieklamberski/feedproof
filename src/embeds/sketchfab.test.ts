import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { sketchfabEmbedResolver } from './sketchfab.js'

describeForEachParser('sketchfabEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, sketchfabEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the share snippet and take the title it states', async () => {
      const value = html`
        <iframe
          title="Borodyanka. Ukraine. War. Banksy."
          frameborder="0"
          allowfullscreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          xr-spatial-tracking
          execution-while-out-of-viewport
          execution-while-not-rendered
          web-share
          width="800"
          height="600"
          src="https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed?ui_theme=dark&dnt=1"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
        title: 'Borodyanka. Ukraine. War. Banksy.',
        width: 800,
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the oEmbed iframe and skip the empty title it writes', async () => {
      const value = html`
        <iframe
          id=""
          title=""
          class=""
          width="640"
          height="360"
          src="https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed"
          frameborder="0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowfullscreen=""
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a uid that is not thirty-two hex characters', async () => {
      const value = html`
        <iframe src="https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e83/embed"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a models path with a segment that is not the viewer', async () => {
      const value = html`
        <iframe
          src="https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/comments"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = html`
        <iframe
          src="https://evil.test/sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the retired spellings and the page url', () => {
    it('should resolve the retired viewer path', async () => {
      const value = html`
        <iframe src="https://sketchfab.com/embed/00b8203bcdc2464bbac4b159be66e838"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the retired page path', async () => {
      const value = html`
        <iframe src="https://sketchfab.com/show/00b8203bcdc2464bbac4b159be66e838"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the unslugged page url', async () => {
      const value = html`
        <iframe src="https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the uid off the end of the slugged page url', async () => {
      const value = html`
        <iframe
          src="https://sketchfab.com/3d-models/borodyanka-ukraine-war-banksy-00b8203bcdc2464bbac4b159be66e838"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'sketchfab',
        id: '00b8203bcdc2464bbac4b159be66e838',
        src: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838/embed',
        url: 'https://sketchfab.com/models/00b8203bcdc2464bbac4b159be66e838',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a slugged page url that ends in no uid', async () => {
      const value = '<iframe src="https://sketchfab.com/3d-models/popular"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
