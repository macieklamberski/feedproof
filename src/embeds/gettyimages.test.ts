import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { composeWidgetEmbedUrl, gettyImagesEmbedResolver, readWidgetConfig } from './gettyimages.js'

// The config is a JavaScript object literal rather than JSON, so it is read key by key. No
// element is involved, so there is no parser to vary.
describe('readWidgetConfig', () => {
  describe('happy paths', () => {
    it('should read every field the player url needs', () => {
      const value = `gie.widgets.load({id:'iPo3qjCKSVJU-bRwLBwNoQ',sig:'OOM9B40xxpnASE4yukj6V63Qa909rgGMxHZzru08p0c=',w:'594px',h:'395px',items:'491183014',caption: true ,tld:'com',is360: false })`
      const expected = {
        items: '491183014',
        et: 'iPo3qjCKSVJU-bRwLBwNoQ',
        sig: 'OOM9B40xxpnASE4yukj6V63Qa909rgGMxHZzru08p0c=',
        tld: 'com',
        caption: 'true',
        width: 594,
        height: 395,
      }

      expect(readWidgetConfig(value)).toEqual(expected)
    })

    it('should fall back to the com domain and no caption when neither is stated', () => {
      const value = `gie.widgets.load({id:'abc',sig:'def=',w:'480px',h:'320px',items:'123456789'})`
      const expected = {
        items: '123456789',
        et: 'abc',
        sig: 'def=',
        tld: 'com',
        caption: 'false',
        width: 480,
        height: 320,
      }

      expect(readWidgetConfig(value)).toEqual(expected)
    })

    it('should keep a regional domain', () => {
      const value = `gie.widgets.load({id:'abc',sig:'def=',items:'123456789',tld:'co.uk'})`
      const expected = {
        items: '123456789',
        et: 'abc',
        sig: 'def=',
        tld: 'co.uk',
        caption: 'false',
        width: undefined,
        height: undefined,
      }

      expect(readWidgetConfig(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should refuse a config with no signature, which the player rejects with a 400', () => {
      const value = `gie.widgets.load({id:'abc',w:'594px',h:'395px',items:'491183014'})`

      expect(readWidgetConfig(value)).toBeUndefined()
    })

    it('should refuse an item id that is not one', () => {
      const value = `gie.widgets.load({id:'abc',sig:'def=',items:'not-an-id'})`

      expect(readWidgetConfig(value)).toBeUndefined()
    })
  })
})

describe('composeWidgetEmbedUrl', () => {
  describe('happy paths', () => {
    it('should build the player url the pre-hydrated iframe carries', () => {
      const value = {
        items: '491183014',
        et: 'iPo3qjCKSVJU-bRwLBwNoQ',
        sig: 'OOM9B40x=',
        tld: 'com',
        caption: 'true',
      }
      const expected =
        'https://embed.gettyimages.com/embed/491183014?et=iPo3qjCKSVJU-bRwLBwNoQ&tld=com&sig=OOM9B40x%3D&caption=true'

      expect(composeWidgetEmbedUrl(value)).toBe(expected)
    })
  })
})

describeForEachParser('gettyImagesEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, gettyImagesEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the player iframe and keep its signed query whole', async () => {
      const value =
        '<iframe src="https://embed.gettyimages.com/embed/492381322?et=cDxg5NFcRMx1XLFxZDgc0w&tld=com&viewMoreLink=on&sig=VHEk4Nmc0V832P7TTYFTGYLHOid_pXnO05LCJzLgVIY=&caption=true" width="594" height="395"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'gettyimages',
        id: '492381322',
        src: 'https://embed.gettyimages.com/embed/492381322?et=cDxg5NFcRMx1XLFxZDgc0w&tld=com&viewMoreLink=on&sig=VHEk4Nmc0V832P7TTYFTGYLHOid_pXnO05LCJzLgVIY=&caption=true',
        url: 'https://www.gettyimages.com/detail/492381322',
        width: 594,
        height: 395,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve an item id shorter than the ones Getty mints today', async () => {
      const value =
        '<iframe src="https://embed.gettyimages.com/embed/83621?et=cDxg5NFcRMx1XLFxZDgc0w&tld=com&sig=VHEk4Nmc0V832P7TTYFTGYLHOid_pXnO05LCJzLgVIY=&caption=true"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'gettyimages',
        id: '83621',
        src: 'https://embed.gettyimages.com/embed/83621?et=cDxg5NFcRMx1XLFxZDgc0w&tld=com&sig=VHEk4Nmc0V832P7TTYFTGYLHOid_pXnO05LCJzLgVIY=&caption=true',
        url: 'https://www.gettyimages.com/detail/83621',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the photo detail page', async () => {
      const value = '<iframe src="https://www.gettyimages.com/detail/491183014"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/embed.gettyimages.com/embed/491183014?sig=x"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
