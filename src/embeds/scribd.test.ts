import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { scribdFlashEmbedResolver, scribdIframeEmbedResolver } from './scribd.js'

describeForEachParser('scribdIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, scribdIframeEmbedResolver)

  describe('the current share-panel iframe', () => {
    // The snippet states height="500" for every document; the ratio beside it is the one that
    // describes this document, so the placeholder carries the ratio instead.
    it('should prefer the stated ratio over the constant height', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          data-aspect-ratio="0.7729220222793488"
          scrolling="no"
          id="526446879"
          width="100%"
          height="500"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '526446879',
        src: 'https://www.scribd.com/embeds/526446879/content',
        url: 'https://www.scribd.com/document/526446879',
        width: 100,
        height: 129,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the declared height when the snippet states no ratio', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          width="100%"
          height="500"
        ></iframe>
      `

      expect(await extract(value)).toMatchObject({ height: 500 })
    })

    it('should ignore a ratio that is not a number', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          data-aspect-ratio="portrait"
          height="500"
        ></iframe>
      `

      expect(await extract(value)).toMatchObject({ height: 500 })
    })
  })

  describe('the pre-2018 spelling', () => {
    it('should resolve a document named on the doc path', async () => {
      const value = html`<iframe src="https://www.scribd.com/doc/108992419"></iframe>`

      expect(await extract(value)).toMatchObject({
        id: '108992419',
        src: 'https://www.scribd.com/embeds/108992419/content',
      })
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a scribd url naming no document', async () => {
      const value = html`<iframe src="https://www.scribd.com/explore"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a document id that is not numeric', async () => {
      const value = html`<iframe src="https://www.scribd.com/embeds/../evil/content"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host carrying the embeds path', async () => {
      const value = html`<iframe src="https://scribd.com.evil.test/embeds/526446879/content"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('scribdFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, scribdFlashEmbedResolver)

  // Flash has rendered nothing since 2020, so without this the placeholder points at the swf
  // itself. The repair is exact because the swf query names the document in the same id space
  // the modern route reads.
  describe('the iPaper viewer', () => {
    it('should repair the dead player to the modern document embed', async () => {
      const value = html`
        <object
          codetype="application/x-shockwave-flash"
          data="http://d1.scribdassets.com/ScribdViewer.swf?document_id=108992419&amp;access_key=key-13davbc"
          type="application/x-shockwave-flash"
          id="doc_349883993364249"
          height="500"
          width="100%"
        ></object>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '108992419',
        src: 'https://www.scribd.com/embeds/108992419/content',
        url: 'https://www.scribd.com/document/108992419',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the same query off the embed half of the pair', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://d.scribd.com/ScribdViewer.swf?document_id=55715&amp;access_key=key-abc"
          width="100%"
          height="500"
        />
      `

      expect(await extract(value)).toMatchObject({
        id: '55715',
        src: 'https://www.scribd.com/embeds/55715/content',
      })
    })

    it('should not carry the constant height the dead player declared', async () => {
      const value = html`
        <object
          data="http://d1.scribdassets.com/ScribdViewer.swf?document_id=108992419"
          height="500"
          width="100%"
        ></object>
      `

      expect(await extract(value)).not.toHaveProperty('height')
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the swf query names no document', async () => {
      const value = html`
        <object data="http://d1.scribdassets.com/ScribdViewer.swf?access_key=key-abc"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a document id outside the numeric shape', async () => {
      const value = html`
        <object data="http://d1.scribdassets.com/ScribdViewer.swf?document_id=../evil"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host serving a viewer of the same name', async () => {
      const value = html`
        <object data="http://evil.test/ScribdViewer.swf?document_id=108992419"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
