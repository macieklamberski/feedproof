import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import { rebuildWistiaEmbeds } from '../transforms/dom/rebuildWistiaEmbeds.js'
import type { EmbedResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { extractWistiaId, wistiaEmbedResolver, wistiaResolveEmbed } from './wistia.js'

describe('extractWistiaId', () => {
  it('should extract id from the player iframe url', () => {
    expect(extractWistiaId('https://fast.wistia.net/embed/iframe/2fg072pftb')).toBe('2fg072pftb')
  })

  it('should extract id from a player url carrying options', () => {
    const value = 'https://fast.wistia.net/embed/iframe/2fg072pftb?web_component=true&seo=false'

    expect(extractWistiaId(value)).toBe('2fg072pftb')
  })

  it('should extract id from the script form jsonp url', () => {
    expect(extractWistiaId('https://fast.wistia.com/embed/medias/0inlutl9au.jsonp')).toBe(
      '0inlutl9au',
    )
  })

  it('should extract id from an account media page', () => {
    expect(extractWistiaId('https://acme.wistia.com/medias/jjxva47kic')).toBe('jjxva47kic')
  })

  it('should return undefined for an id of the wrong length', () => {
    expect(extractWistiaId('https://fast.wistia.net/embed/iframe/short')).toBeUndefined()
  })

  it('should return undefined for a wistia url naming no media', () => {
    expect(extractWistiaId('https://wistia.com/pricing')).toBeUndefined()
  })
})

describe('wistiaResolveEmbed', () => {
  it('should mint the player url from the id', () => {
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: '2fg072pftb',
      src: 'https://fast.wistia.net/embed/iframe/2fg072pftb',
    }

    expect(wistiaResolveEmbed('https://fast.wistia.net/embed/iframe/2fg072pftb?seo=false')).toEqual(
      expected,
    )
  })
})

describeForEachParser('wistiaEmbedResolver', (parseHtml) => {
  const context: TransformContext = { ...baseContext, widgetResolvers: [wistiaEmbedResolver] }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      rebuildWistiaEmbeds(context),
      convertWidgets(context),
    ])
  }

  it('should resolve the native player iframe', async () => {
    const value =
      '<iframe src="https://fast.wistia.net/embed/iframe/2fg072pftb" class="wistia_embed"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="wistia"')
    expect(result).toContain('data-embed-id="2fg072pftb"')
  })

  // The JS facade has no iframe at all: rebuildWistiaEmbeds mints one, and the resolver reads
  // it on the same pass, so the two halves have to keep agreeing on the url they build.
  it('should resolve a facade the rebuild pass materialized', async () => {
    const value =
      '<div class="wistia_responsive_padding"><div class="wistia_embed wistia_async_2fg072pftb"></div></div>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="wistia"')
    expect(result).toContain('data-embed-id="2fg072pftb"')
  })

  it('should leave a non-media wistia url to the generic placeholder', async () => {
    const result = await transform('<iframe src="https://wistia.com/pricing"></iframe>')

    expect(result).not.toContain('data-embed-provider')
  })
})
