import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { podomaticEmbedResolver, podomaticResolveEmbed } from './podomatic.js'

describe('podomaticResolveEmbed', () => {
  describe('happy paths', () => {
    it('should read an episode off the html5 player', () => {
      const value = 'https://podomatic.com/embed/html5/episode/10076958?autoplay=false'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958',
        height: 208,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should read a podcast off the html5 player', () => {
      const value = 'https://www.podomatic.com/embed/html5/podcast/2295001'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'podcast/2295001',
        src: 'https://www.podomatic.com/embed/html5/podcast/2295001',
        height: 208,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/podomatic.com/embed/html5/episode/10076958'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a podomatic url naming no player', () => {
      const value = 'https://www.podomatic.com/podcasts/lisboalowcost'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a url that cannot be parsed', () => {
      const value = 'https://['

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should refuse an id that is not a podomatic id', () => {
      const value = 'https://www.podomatic.com/embed/html5/episode/latest'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })

    it('should read a kind PodOmatic has not published yet', () => {
      const value = 'https://www.podomatic.com/embed/html5/channel/2295001'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'channel/2295001',
        src: 'https://www.podomatic.com/embed/html5/channel/2295001',
        height: 208,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should refuse an id sitting where the kind belongs', () => {
      const value = 'https://www.podomatic.com/embed/html5/2295001'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('the three html5 styles, each with its own height', () => {
    it('should keep the small style and its shorter box', () => {
      const value = 'https://www.podomatic.com/embed/html5/episode/10076958?style=small'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958?style=small',
        height: 97,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the square style and its taller box', () => {
      const value = 'https://www.podomatic.com/embed/html5/episode/10076958?style=square'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958?style=square',
        height: 504,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should drop the normal style, which is what the bare url already selects', () => {
      const value = 'https://www.podomatic.com/embed/html5/episode/10198381?style=normal'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10198381',
        src: 'https://www.podomatic.com/embed/html5/episode/10198381',
        height: 208,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should fall back to the normal box for a style the player does not have', () => {
      const value = 'https://www.podomatic.com/embed/html5/episode/10198381?style=widescreen'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10198381',
        src: 'https://www.podomatic.com/embed/html5/episode/10198381',
        height: 208,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('the current player, which names a podcast and picks an episode out of it', () => {
    it('should take the episode the parameter names', () => {
      const value =
        'https://www.podomatic.com/embed/v2/podcast/5476235?episode_id=11083318&theme=light'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/11083318',
        src: 'https://www.podomatic.com/embed/v2/podcast/5476235?episode_id=11083318&theme=light',
        height: 205,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should keep a theme value from minting a parameter of its own', () => {
      const value =
        'https://www.podomatic.com/embed/v2/podcast/5476235?episode_id=11083318&theme=light%26autoplay%3Dtrue'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/11083318',
        src: 'https://www.podomatic.com/embed/v2/podcast/5476235?episode_id=11083318&theme=light%26autoplay%3Dtrue',
        height: 205,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should fall back to the podcast when no episode is picked', () => {
      const value = 'https://www.podomatic.com/embed/v2/podcast/5476235'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'podcast/5476235',
        src: 'https://www.podomatic.com/embed/v2/podcast/5476235',
        height: 205,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    it('should drop an episode parameter that is not an id', () => {
      const value = 'https://www.podomatic.com/embed/v2/podcast/5476235?episode_id=latest'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'podcast/5476235',
        src: 'https://www.podomatic.com/embed/v2/podcast/5476235',
        height: 205,
      }

      expect(podomaticResolveEmbed(value)).toEqual(expected)
    })

    // The episode is a real id, so the podcast segment is the only thing standing between the
    // feed and the minted path.
    it('should refuse a podcast segment that is not an id', () => {
      const value = 'https://www.podomatic.com/embed/v2/podcast/..%2F..%2Fadmin?episode_id=11083318'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('the carriers left to the generic fallback', () => {
    // The wrapper 404s and the account slug inside it addresses no live player, so there is
    // nothing to mint from.
    it('should leave the dead multi frame alone', () => {
      const value =
        'https://www.podomatic.com/embed/frame/multi/0?json_url=http%3A%2F%2Ffilmdonthurt.podomatic.com%2Fembed%2Fmulti%2F0%3Fcolor%3Def3435'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })

    // The Flash player names its episode by account and timestamp, and only a fetch turns that
    // into the numeric id the html5 player takes.
    it('should leave the Flash player alone', () => {
      const value = 'https://lisboalowcost.podomatic.com/swf/joeplayer_v20.swf'

      expect(podomaticResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('podomaticEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podomaticEmbedResolver)

  describe('happy paths', () => {
    it('should take the player out of an iframe', async () => {
      const value = '<iframe src="https://www.podomatic.com/embed/html5/episode/10076958"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958',
        height: 208,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/podomatic.com/embed/html5/episode/10076958"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the box the snippet writes', () => {
    // The player is 208 tall at every width, so the width beside that height is what has to go:
    // a reader reserving space from the pair would hold 2.42:1 open at any width but 504.
    it('should drop the width the snippet states beside the right height', async () => {
      const value = html`
        <iframe
          src="https://podomatic.com/embed/html5/episode/10076958?autoplay=false"
          width="504"
          height="208"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958',
        height: 208,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The small player's frames state the browser's own default 300 by 150 and put the real
    // height in a style, so the attributes say 2:1 about a 97 pixel bar.
    it('should keep the small style height over the default box', async () => {
      const value = html`
        <iframe
          src="https://podomatic.com/embed/html5/episode/10076958?style=small"
          width="300"
          height="150"
          style="width: 100%; height: 97px;"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'podomatic',
        id: 'episode/10076958',
        src: 'https://www.podomatic.com/embed/html5/episode/10076958?style=small',
        height: 97,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('podomatic through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a player frame the default list reaches', async () => {
    const value = '<iframe src="https://www.podomatic.com/embed/html5/episode/10076958"></iframe>'
    const expected = html`
      <div
        data-embed-id="episode/10076958"
        data-embed-provider="podomatic"
        data-embed-src="https://www.podomatic.com/embed/html5/episode/10076958"
        data-embed-height="208"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Every PodOmatic show serves its episodes from its own account subdomain, which listing
  // `podomatic.com` claims. Only the `embed` route check keeps the audio playable.
  it('should leave a podomatic audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://ataiii.podomatic.com/enclosure/2016-08-10T07_54_26-07_00.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://ataiii.podomatic.com/enclosure/2016-08-10T07_54_26-07_00.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
