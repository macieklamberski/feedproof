import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult, TransformContext } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
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

  it('should return undefined when there is no feed parameter', () => {
    const value = 'https://www.mixcloud.com/discover/house/'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  // A show is exactly user plus slug; anything deeper is a section of the site.
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
  const context: TransformContext = { ...baseContext, widgetResolvers: [mixcloudEmbedResolver] }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertWidgets(context)])
  }

  it('should resolve the widget iframe', async () => {
    const value =
      '<iframe width="100%" height="400" src="https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F"></iframe>'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="mixcloud"')
    expect(result).toContain('data-embed-id="photogmusic/no-filter"')
    expect(result).toContain('data-embed-height="400"')
  })

  // The legacy Flash carrier reaches the resolver through the shared carrier selector. Feeds
  // write this src protocol-relative; resolveRelativeUrls makes it absolute earlier in the
  // pipeline, and this pass runs convertWidgets alone, so the url is absolute here.
  it('should resolve the legacy Flash player', async () => {
    const value =
      '<embed src="https://www.mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=http%3A%2F%2Fwww.mixcloud.com%2FFakeIDRadio%2F4-natty-champs%2F&embed_type=widget_standard">'
    const result = await transform(value)

    expect(result).toContain('data-embed-provider="mixcloud"')
    expect(result).toContain('data-embed-id="FakeIDRadio/4-natty-champs"')
    expect(result).not.toContain('<embed')
  })

  it('should leave a non-show mixcloud url to the generic placeholder', async () => {
    const value = '<iframe src="https://www.mixcloud.com/discover/house/"></iframe>'
    const result = await transform(value)

    expect(result).not.toContain('data-embed-provider')
  })
})
