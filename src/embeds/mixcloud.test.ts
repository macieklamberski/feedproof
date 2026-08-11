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

    expect(extractMixcloudShow(value)).toBe('photogmusic/no-filter-may-28-2018-hour-one')
  })

  it('should read a feed parameter holding a whole url', () => {
    const value =
      'http://www.mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=http%3A%2F%2Fwww.mixcloud.com%2Ffrederik%2Foct-2011-exclusive-set%2F&embed_type=widget_standard'

    expect(extractMixcloudShow(value)).toBe('frederik/oct-2011-exclusive-set')
  })

  it('should read the widget on its own host', () => {
    const value =
      'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2Fdjgavinboyd%2Fsoul-has-no-tempo%2F'

    expect(extractMixcloudShow(value)).toBe('djgavinboyd/soul-has-no-tempo')
  })

  it('should return undefined when there is no feed parameter', () => {
    expect(extractMixcloudShow('https://www.mixcloud.com/discover/house/')).toBeUndefined()
  })

  // A show is exactly user plus slug; anything deeper is a section of the site.
  it('should return undefined for a path that is not a show', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fcategories%2Fhouse%2Ftop%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })

  it('should return undefined for a segment outside the url charset', () => {
    const value = 'https://www.mixcloud.com/widget/iframe/?feed=%2Fuser%2F..%252Fetc%2F'

    expect(extractMixcloudShow(value)).toBeUndefined()
  })
})

describe('mixcloudResolveEmbed', () => {
  it('should mint the widget and canonical urls from the show', () => {
    const expected: EmbedResolverResult = {
      provider: 'mixcloud',
      id: 'photogmusic/no-filter',
      src: 'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F',
      url: 'https://www.mixcloud.com/photogmusic/no-filter/',
    }

    expect(
      mixcloudResolveEmbed(
        'https://www.mixcloud.com/widget/iframe/?feed=%2Fphotogmusic%2Fno-filter%2F',
      ),
    ).toEqual(expected)
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
    const result = await transform(
      '<iframe src="https://www.mixcloud.com/discover/house/"></iframe>',
    )

    expect(result).not.toContain('data-embed-provider')
  })
})
