import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractMixcloudShow, mixcloudEmbedResolver, mixcloudResolveEmbed } from './mixcloud.js'

describe('extractMixcloudShow', () => {
  it('should read a feed parameter holding a path', () => {
    const value =
      'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter-may-28-2018-hour-one%2F'
    const expected = 'photogmusic/no-filter-may-28-2018-hour-one'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  it('should read a feed parameter holding a whole url', () => {
    const value =
      'http://www.mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=http%3A%2F%2Fwww.mixcloud.com%2Ffrederik%2Foct-2011-exclusive-set%2F&embed_type=widget_standard'
    const expected = 'frederik/oct-2011-exclusive-set'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  it('should read the widget on its own host', () => {
    const value =
      'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2Fdjgavinboyd%2Fsoul-has-no-tempo%2F'
    const expected = 'djgavinboyd/soul-has-no-tempo'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  // The page url a person copies from the address bar. It carries no `feed` parameter, so the
  // show comes from the path itself.
  it('should read a show from the page path', () => {
    const value = 'https://www.mixcloud.com/photogmusic/no-filter-may-28-2018-hour-one/'
    const expected = 'photogmusic/no-filter-may-28-2018-hour-one'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  // Each of these takes the shape of a show and is a page of the site instead. The show above
  // is the control: it has the same two-segment shape and still reads.
  it.each([
    'https://www.mixcloud.com/discover/house/',
    'https://www.mixcloud.com/genres/house/',
    'https://www.mixcloud.com/categories/house/',
    'https://www.mixcloud.com/tag/house/',
    'https://www.mixcloud.com/live/photogmusic/',
    'https://www.mixcloud.com/photogmusic/uploads/',
    'https://www.mixcloud.com/photogmusic/favorites/',
    'https://www.mixcloud.com/photogmusic/listens/',
    'https://www.mixcloud.com/photogmusic/stream/',
    'https://www.mixcloud.com/photogmusic/playlists/',
  ])('should return undefined for the site page %s', (value) => {
    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  // Without the site-segment check the widget's own two-segment url reads as the user `widget`
  // with the show `iframe`, which is what a carrier stripped of its parameters would be.
  it('should return undefined for the widget url carrying no feed parameter', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  // The same exclusion reaches the parameter, where it was already wrong: this minted
  // `mixcloud.com/photogmusic/uploads/` as though a listing page were a show.
  it('should return undefined for a feed parameter naming a listing page', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fuploads%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  // A show is exactly user plus slug. Anything deeper is a section of the site.
  it('should return undefined for a path that is not a show', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fcategories%2Fhouse%2Ftop%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  // Mixcloud keeps the script a publisher titled the show in, so a slug is as often Japanese or
  // accented as it is ascii.
  it('should read a show titled outside the ascii range', () => {
    const value =
      'https://www.mixcloud.com/widget/iframe/?feed=%2Ffunairacing%2F9-%E3%81%82%E3%81%B9c%E9%96%A2%E6%9D%B1%2F'
    const expected = 'funairacing/9-あべc関東'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  it('should read an accented user name', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fszita-j%25C3%25A1nos%2Fshow%2F'
    const expected = 'szita-jános/show'

    expect(extractMixcloudShow(value)).toBe(expected)
  })

  it('should return undefined for a segment that climbs out of the path', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fuser%2F..%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  it('should return undefined for a malformed escape', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fuser%2F%E0%A4%A%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  it('should return undefined for a segment outside the url charset', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fuser%2F..%252Fetc%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })
})

describe('mixcloudResolveEmbed', () => {
  it('should mint the widget and canonical urls from the show', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F'
    const expected: EmbedResolverResult = {
      provider: 'mixcloud',
      id: 'photogmusic/no-filter',
      src: 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F',
      url: 'https://www.mixcloud.com/photogmusic/no-filter/',
    }

    expect(mixcloudResolveEmbed(value)).toEqual(expected)
  })
})

describeForEachParser('mixcloudEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mixcloudEmbedResolver)

  it('should resolve the widget iframe', async () => {
    const value = html`
      <iframe
        width="100%"
        height="400"
        src="https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'mixcloud',
      id: 'photogmusic/no-filter',
      src: 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F',
      url: 'https://www.mixcloud.com/photogmusic/no-filter/',
      height: 400,
    }

    expect(await extract(value)).toEqual(expected)
  })

  // The legacy Flash carrier reaches the resolver through the shared carrier selector. Feeds
  // write this src protocol-relative. ResolveRelativeUrls makes it absolute earlier in the
  // pipeline, so the url is absolute by the time the resolver sees it.
  it('should resolve the legacy Flash player', async () => {
    const value = html`
      <embed
        src="https://www.mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=http%3A%2F%2Fwww.mixcloud.com%2FFakeIDRadio%2F4-natty-champs%2F&embed_type=widget_standard"
      >
    `
    const expected: EmbedResolverResult = {
      provider: 'mixcloud',
      id: 'FakeIDRadio/4-natty-champs',
      src: 'https://www.mixcloud.com/widget/iframe/?feed=%2FFakeIDRadio%2F4-natty-champs%2F',
      url: 'https://www.mixcloud.com/FakeIDRadio/4-natty-champs/',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should leave a non-show mixcloud url to the generic placeholder', async () => {
    const value = '<iframe src="https://www.mixcloud.com/discover/house/"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })

  // `injectEnclosures` synthesizes a carrier for every enclosure and offers it to the url
  // resolvers, so a feed naming its show by its page url reaches the resolver this way.
  it('should resolve a show page framed as an embed', async () => {
    const value = '<iframe src="https://www.mixcloud.com/photogmusic/no-filter/"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'mixcloud',
      id: 'photogmusic/no-filter',
      src: 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F',
      url: 'https://www.mixcloud.com/photogmusic/no-filter/',
    }

    expect(await extract(value)).toEqual(expected)
  })
})
