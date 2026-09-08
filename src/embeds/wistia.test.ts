import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, resolverExtractor } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import { rebuildWistiaEmbeds } from '../transforms/dom/rebuildWistiaEmbeds.js'
import type { EmbedResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { extractWistiaEmbed, wistiaEmbedResolver, wistiaResolveEmbed } from './wistia.js'

describe('extractWistiaEmbed', () => {
  it('should extract id from the player iframe url', () => {
    const value = 'https://fast.wistia.net/embed/iframe/2fg072pftb'
    const expected = { route: 'iframe', id: '2fg072pftb' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  it('should extract id from a player url carrying options', () => {
    const value = 'https://fast.wistia.net/embed/iframe/2fg072pftb?web_component=true&seo=false'
    const expected = { route: 'iframe', id: '2fg072pftb' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  it('should extract id from the script form jsonp url', () => {
    const value = 'https://fast.wistia.com/embed/medias/0inlutl9au.jsonp'
    const expected = { route: 'iframe', id: '0inlutl9au' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  it('should extract id and page from an account media page', () => {
    const value = 'https://acme.wistia.com/medias/jjxva47kic'
    const expected = {
      route: 'iframe',
      id: 'jjxva47kic',
      page: 'https://acme.wistia.com/medias/jjxva47kic',
    }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  // The share parameter names nothing the page needs, and the page has to be one url whatever
  // the carrier spelled, so the same media does not reach enrichment as two placeholders.
  it('should drop the query from the page it reads', () => {
    const value = 'https://acme.wistia.com/medias/jjxva47kic?wvideo=jjxva47kic'
    const expected = {
      route: 'iframe',
      id: 'jjxva47kic',
      page: 'https://acme.wistia.com/medias/jjxva47kic',
    }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  it('should read an id longer than the ten characters Wistia mints today', () => {
    const value = 'https://fast.wistia.net/embed/iframe/2fg072pftb9'
    const expected = { route: 'iframe', id: '2fg072pftb9' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a wistia url naming no media', () => {
    const value = 'https://wistia.com/pricing'

    expect(extractWistiaEmbed(value)).toBeUndefined()
  })

  // A channel and a playlist are separate players, so the route travels with the id.
  it('should read a channel with its own route', () => {
    const value = 'https://fast.wistia.net/embed/channel/sapab9p6qd'
    const expected = { route: 'channel', id: 'sapab9p6qd' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  // The account host spells the channel page with the plural, and the page is login-gated even
  // for a public channel, so rebuilding it onto the public player repairs a login screen.
  it('should read a channel from its account page', () => {
    const value = 'https://home.wistia.com/channels/sapab9p6qd'
    const expected = { route: 'channel', id: 'sapab9p6qd' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })

  // A channel has no vanity slug: every route carries the 10-character hashed id, so a slug-shaped
  // segment is not a channel and must not be interpolated into a player url.
  it('should return undefined for a slug-shaped channel segment', () => {
    const value = 'https://home.wistia.com/channels/talking-too-loud'

    expect(extractWistiaEmbed(value)).toBeUndefined()
  })

  // The route is a path segment, so it can name a member every object inherits. That has to
  // read as no route at all, the way any word the player does not serve does.
  it('should return undefined for a route naming an inherited member', () => {
    const value = 'https://fast.wistia.net/embed/constructor/sapab9p6qd'

    expect(extractWistiaEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a route the player does not serve', () => {
    const value = 'https://fast.wistia.net/embed/gallery/sapab9p6qd'

    expect(extractWistiaEmbed(value)).toBeUndefined()
  })

  it('should read a playlist with its own route', () => {
    const value = 'https://fast.wistia.net/embed/playlists/aodt9etokc'
    const expected = { route: 'playlists', id: 'aodt9etokc' }

    expect(extractWistiaEmbed(value)).toEqual(expected)
  })
})

describe('wistiaResolveEmbed', () => {
  // The id is qualified for the two routes that are not a media, since all three share one id
  // grammar and enrichment receives the provider and the id alone.
  it('should mint the channel player and qualify its id', () => {
    const value = 'https://fast.wistia.net/embed/channel/sapab9p6qd'
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: 'channel/sapab9p6qd',
      src: 'https://fast.wistia.net/embed/channel/sapab9p6qd',
    }

    expect(wistiaResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the playlist player and qualify its id', () => {
    const value = 'https://fast.wistia.net/embed/playlists/aodt9etokc'
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: 'playlists/aodt9etokc',
      src: 'https://fast.wistia.net/embed/playlists/aodt9etokc',
    }

    expect(wistiaResolveEmbed(value)).toEqual(expected)
  })

  // Only the account page names the account, so it is the one carrier that can state a url.
  it('should name the page an account media url already spells out', () => {
    const value = 'https://acme.wistia.com/medias/2fg072pftb'
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: '2fg072pftb',
      src: 'https://fast.wistia.net/embed/iframe/2fg072pftb',
      url: 'https://acme.wistia.com/medias/2fg072pftb',
    }

    expect(wistiaResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the player url from the id', () => {
    const value = 'https://fast.wistia.net/embed/iframe/2fg072pftb?seo=false'
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: '2fg072pftb',
      src: 'https://fast.wistia.net/embed/iframe/2fg072pftb',
    }

    expect(wistiaResolveEmbed(value)).toEqual(expected)
  })
})

describeForEachParser('wistiaEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, wistiaEmbedResolver)

  it('should resolve the native player iframe', async () => {
    const value = html`
      <iframe
        src="https://fast.wistia.net/embed/iframe/2fg072pftb"
        class="wistia_embed"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: '2fg072pftb',
      src: 'https://fast.wistia.net/embed/iframe/2fg072pftb',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // Wistia's embed snippet writes the media's name here with the word `Video` appended, and it
  // is taken as written: nothing tells that suffix from a name ending in the same word.
  it('should take the name out of the stated title', async () => {
    const value = html`
      <iframe
        src="https://fast.wistia.net/embed/iframe/2fg072pftb"
        title="Behind the scenes at the office Video"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'wistia',
      id: '2fg072pftb',
      src: 'https://fast.wistia.net/embed/iframe/2fg072pftb',
      title: 'Behind the scenes at the office Video',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should leave a non-media wistia url to the generic placeholder', async () => {
    const value = '<iframe src="https://wistia.com/pricing"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

// The JS facade has no iframe at all: rebuildWistiaEmbeds mints one, and the resolver reads it
// on the same pass, so the two halves have to keep agreeing on the url they build.
describeForEachParser('wistia facades the rebuild pass materializes', (parseHtml) => {
  const context: TransformContext = {
    ...baseContext,
    widgetResolvers: [wistiaEmbedResolver],
  }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      rebuildWistiaEmbeds(context),
      convertWidgets(context),
    ])
  }

  it('should resolve a facade into the same placeholder as the native iframe', async () => {
    const value = html`
      <div class="wistia_responsive_padding">
        <div class="wistia_embed wistia_async_2fg072pftb"></div>
      </div>
    `
    const expected = html`
      <div
        data-embed-src="https://fast.wistia.net/embed/iframe/2fg072pftb"
        data-embed-provider="wistia"
        data-embed-id="2fg072pftb"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })
})
