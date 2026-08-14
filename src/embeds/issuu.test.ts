import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { issuuIframeEmbedResolver, issuuWidgetEmbedResolver } from './issuu.js'

describeForEachParser('issuuWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, issuuWidgetEmbedResolver)

  describe('the config id div', () => {
    // The shape 481 corpus feeds lose, copied from ecosistemaurbano.org (2026-08-14). The size
    // lives in the inline style and is the document's own page ratio.
    it('should mint the reader url from the config id', async () => {
      const value = html`
        <div
          class="issuuembed"
          style="width: 640px; height: 452px;"
          data-configid="1016421/47623369"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: '1016421/47623369',
        src: 'https://e.issuu.com/embed.html#1016421/47623369',
        width: 640,
        height: 452,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a div that states no size', async () => {
      const value = html`<div class="issuuembed" data-configid="1016421/47623369"></div>`
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: '1016421/47623369',
        src: 'https://e.issuu.com/embed.html#1016421/47623369',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the document url div', () => {
    it('should mint the reader url and the canonical page from data-url', async () => {
      const value = html`
        <div
          class="issuuembed"
          style="width: 525px; height: 340px;"
          data-url="https://issuu.com/ecosistemaurbano/docs/paisaje_transversal"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/paisaje_transversal',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal',
        url: 'https://issuu.com/ecosistemaurbano/docs/paisaje_transversal',
        width: 525,
        height: 340,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry a page number from the reader url into the query', async () => {
      const value = html`
        <div
          class="issuuembed"
          data-url="https://issuu.com/ecosistemaurbano/docs/paisaje_transversal/12"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/paisaje_transversal',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal&p=12',
        url: 'https://issuu.com/ecosistemaurbano/docs/paisaje_transversal',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A malformed config id must not block a resolution the second attribute can still supply.
    it('should fall back to data-url when the config id is malformed', async () => {
      const value = html`
        <div
          class="issuuembed"
          data-configid="not-a-config-id"
          data-url="https://issuu.com/ecosistemaurbano/docs/paisaje_transversal"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/paisaje_transversal',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal',
        url: 'https://issuu.com/ecosistemaurbano/docs/paisaje_transversal',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a config id that is not a counter pair', async () => {
      const value = html`<div class="issuuembed" data-configid="../evil/1"></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty config id', async () => {
      const value = html`<div class="issuuembed" data-configid=""></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a data-url on another host', async () => {
      const value = html`
        <div class="issuuembed" data-url="https://evil.test/issuu.com/user/docs/document"></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an issuu url that names no document', async () => {
      const value = html`
        <div class="issuuembed" data-url="https://issuu.com/ecosistemaurbano"></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a div carrying neither attribute', async () => {
      const value = html`<div class="issuuembed"></div>`

      expect(await extract(value)).toBeUndefined()
    })

    // The bare attribute is not the platform: the class is the other half of the guard.
    it('should not match a data-configid div without the issuu class', async () => {
      const value = html`<div data-configid="1016421/47623369"></div>`

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('issuuIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, issuuIframeEmbedResolver)

  describe('the reader iframe', () => {
    // Publishers write the hash form by hand, which is where the config id url can be read off
    // besides the loader (ecosistemaurbano.org, 2026-08-14).
    it('should claim the hash form', async () => {
      const value = html`
        <iframe
          style="border: none; width: 620px; height: 439px;"
          src="https://e.issuu.com/embed.html#1016421/67761615"
          allowfullscreen="allowfullscreen"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: '1016421/67761615',
        src: 'https://e.issuu.com/embed.html#1016421/67761615',
        width: 620,
        height: 439,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should claim the query form and drop the display parameters', async () => {
      const value = html`
        <iframe
          src="https://e.issuu.com/embed.html?backgroundColor=%23ffffff&u=ecosistemaurbano&d=paisaje_transversal&hideIssuuLogo=true"
          width="525"
          height="340"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/paisaje_transversal',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal',
        url: 'https://issuu.com/ecosistemaurbano/docs/paisaje_transversal',
        width: 525,
        height: 340,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the page the query names', async () => {
      const value = html`
        <iframe
          src="https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal&p=7"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/paisaje_transversal',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=paisaje_transversal&p=7',
        url: 'https://issuu.com/ecosistemaurbano/docs/paisaje_transversal',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // anonymous-embed.html answers 403 for every request, so these 31 feeds render nothing until
    // the query moves onto the path that still serves the reader.
    it('should repair the dead anonymous embed path', async () => {
      const value = html`
        <iframe
          loading="lazy"
          src="https://e.issuu.com/anonymous-embed.html?u=ecosistemaurbano&d=180309-idea_hermosillo"
          width="620"
          height="400"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'issuu',
        id: 'ecosistemaurbano/180309-idea_hermosillo',
        src: 'https://e.issuu.com/embed.html?u=ecosistemaurbano&d=180309-idea_hermosillo',
        url: 'https://issuu.com/ecosistemaurbano/docs/180309-idea_hermosillo',
        width: 620,
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an issuu url naming no document', async () => {
      const value = html`<iframe src="https://e.issuu.com/embed.html"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a query missing the publisher', async () => {
      const value = html`
        <iframe src="https://e.issuu.com/embed.html?d=paisaje_transversal"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The query is interpolated straight into the minted url, so a name that is not a name has
    // to stop here.
    it('should return undefined for a document name holding a traversal', async () => {
      const value = html`
        <iframe src="https://e.issuu.com/embed.html?u=ecosistemaurbano&d=../../evil"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim another host spelling the embed path', async () => {
      const value = html`
        <iframe src="https://evil.test/embed.html?u=ecosistemaurbano&d=paisaje_transversal"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not claim an issuu path that is not the reader', async () => {
      const value = html`
        <iframe src="https://static.issuu.com/widgets/shelf/index.html?u=ecosistemaurbano"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('deliberate non-resolutions', () => {
    // 364 corpus feeds carry the Flash viewer and 353 of them have no companion iframe, so those
    // documents are lost. They stay lost: the `documentId` flashvar is a third id space, and
    // neither the hash form nor the query form accepts it. `IssuuReader.swf` is still served,
    // which changes nothing because no browser plays it.
    it('should leave the Flash viewer to the generic fallback', async () => {
      const value = html`
        <embed
          src="https://static.issuu.com/webembed/viewers/style1/v2/IssuuReader.swf"
          type="application/x-shockwave-flash"
          flashvars="mode=mini&documentId=110303235823-c6b8b4bc1d1a4dd0"
          width="420"
          height="272"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
