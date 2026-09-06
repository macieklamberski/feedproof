import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  kalturaIframeEmbedResolver,
  kalturaResolveEmbed,
  kalturaScriptEmbedResolver,
} from './kaltura.js'

describe('kalturaResolveEmbed', () => {
  describe('happy paths', () => {
    it('should keep the player url and mint the poster from its two ids', () => {
      const value =
        'https://cdnapisec.kaltura.com/p/520801/sp/52080100/embedIframeJs/uiconf_id/31230141/partner_id/520801?iframeembed=true&entry_id=1_w0bwzism'
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '520801/1_w0bwzism',
        src: 'https://cdnapisec.kaltura.com/p/520801/sp/52080100/embedIframeJs/uiconf_id/31230141/partner_id/520801?iframeembed=true&entry_id=1_w0bwzism',
        thumbnail: 'https://cdnapisec.kaltura.com/p/520801/thumbnail/entry_id/1_w0bwzism/width/640',
      }

      expect(kalturaResolveEmbed(value)).toEqual(expected)
    })

    it('should read the newer playkit player', () => {
      const value =
        'https://cdnapisec.kaltura.com/p/2296822/embedPlaykitJs/uiconf_id/52714152?iframeembed=true&entry_id=1_bs3s0fie'
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '2296822/1_bs3s0fie',
        src: 'https://cdnapisec.kaltura.com/p/2296822/embedPlaykitJs/uiconf_id/52714152?iframeembed=true&entry_id=1_bs3s0fie',
        thumbnail:
          'https://cdnapisec.kaltura.com/p/2296822/thumbnail/entry_id/1_bs3s0fie/width/640',
      }

      expect(kalturaResolveEmbed(value)).toEqual(expected)
    })

    it('should mint the poster on the secure host for the plain api host', () => {
      const value =
        'http://cdnapi.kaltura.com/p/483511/sp/48351100/embedIframeJs/uiconf_id/5590821/partner_id/483511?iframeembed=true&entry_id=0_hjiuf078'
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '483511/0_hjiuf078',
        src: 'http://cdnapi.kaltura.com/p/483511/sp/48351100/embedIframeJs/uiconf_id/5590821/partner_id/483511?iframeembed=true&entry_id=0_hjiuf078',
        thumbnail: 'https://cdnapisec.kaltura.com/p/483511/thumbnail/entry_id/0_hjiuf078/width/640',
      }

      expect(kalturaResolveEmbed(value)).toEqual(expected)
    })

    it('should keep a regional api host for the poster', () => {
      const value =
        'https://api.ca.kaltura.com/p/148/sp/14800/embedIframeJs/uiconf_id/23449759/partner_id/148?iframeembed=true&entry_id=0_gs5r8b3x'
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '148/0_gs5r8b3x',
        src: 'https://api.ca.kaltura.com/p/148/sp/14800/embedIframeJs/uiconf_id/23449759/partner_id/148?iframeembed=true&entry_id=0_gs5r8b3x',
        thumbnail: 'https://api.ca.kaltura.com/p/148/thumbnail/entry_id/0_gs5r8b3x/width/640',
      }

      expect(kalturaResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value =
        'https://evil.test/cdnapisec.kaltura.com/p/520801/embedPlaykitJs/uiconf_id/1?iframeembed=true&entry_id=1_w0bwzism'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a player that names no entry', () => {
      const value =
        'https://cdnapisec.kaltura.com/p/520801/sp/52080100/embedIframeJs/uiconf_id/31230141/partner_id/520801?iframeembed=true'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore an entry id that is not one', () => {
      const value =
        'https://cdnapisec.kaltura.com/p/520801/embedPlaykitJs/uiconf_id/52714152?iframeembed=true&entry_id=latest'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })

    it('should leave the Flash widget alone', () => {
      const value =
        'http://www.kaltura.com/index.php/kwidget/wid/_203822/uiconf_id/1898102/entry_id/1_s2i7y09d/'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })

    it('should leave the legacy extwidget iframe alone', () => {
      const value =
        'http://cdnapi.kaltura.com/index.php/extwidget/embedIframe/entry_id/0_hjiuf078/widget_id/_483511/uiconf_id/5590821'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })

    it('should leave the MediaSpace secure embed alone', () => {
      const value =
        'https://2401761.mediaspace.kaltura.com/embed/secure/iframe/entryId/0_kfreggwh/uiConfId/42593641'

      expect(kalturaResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('kalturaIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, kalturaIframeEmbedResolver)

  describe('happy paths', () => {
    it('should take the title and the box the publisher states', async () => {
      const value = html`
        <iframe
          title="Calendar Appointments (Exam Makeups)"
          id="kaltura_player"
          src="https://cdnapisec.kaltura.com/p/1660902/sp/166090200/embedIframeJs/uiconf_id/25717641/partner_id/1660902?iframeembed=true&playerId=kaltura_player&entry_id=1_1pavfxkg"
          width="560"
          height="395"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '1660902/1_1pavfxkg',
        src: 'https://cdnapisec.kaltura.com/p/1660902/sp/166090200/embedIframeJs/uiconf_id/25717641/partner_id/1660902?iframeembed=true&playerId=kaltura_player&entry_id=1_1pavfxkg',
        thumbnail:
          'https://cdnapisec.kaltura.com/p/1660902/thumbnail/entry_id/1_1pavfxkg/width/640',
        title: 'Calendar Appointments (Exam Makeups)',
        width: 560,
        height: 395,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should drop the label KMS writes on every iframe', async () => {
      const value = html`
        <iframe
          title="Kaltura Player"
          src="https://cdnapisec.kaltura.com/p/2296822/embedPlaykitJs/uiconf_id/52714152?iframeembed=true&entry_id=1_bs3s0fie"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '2296822/1_bs3s0fie',
        src: 'https://cdnapisec.kaltura.com/p/2296822/embedPlaykitJs/uiconf_id/52714152?iframeembed=true&entry_id=1_bs3s0fie',
        thumbnail:
          'https://cdnapisec.kaltura.com/p/2296822/thumbnail/entry_id/1_bs3s0fie/width/640',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/cdnapisec.kaltura.com/p/520801/embedPlaykitJs/uiconf_id/1?iframeembed=true&entry_id=1_w0bwzism"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave the Flash object alone', async () => {
      const value = html`
        <object
          type="application/x-shockwave-flash"
          data="http://www.kaltura.com/index.php/kwidget/wid/_203822/uiconf_id/1898102/entry_id/1_s2i7y09d/"
          width="560"
          height="345"
        ></object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('kalturaScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, kalturaScriptEmbedResolver)

  describe('happy paths', () => {
    it('should rebuild the iframe the auto-embed script would have written', async () => {
      const value = html`
        <div
          id="kaltura_player_1484668390"
          style="height: 395px; width: 560px;"
        >
          <script src="https://cdnapisec.kaltura.com/p/1758271/sp/175827100/embedIframeJs/uiconf_id/29300931/partner_id/1758271?autoembed=true&entry_id=1_jhjo10ru&playerId=kaltura_player_1484668390&cache_st=1484668390&width=560&height=395&flashvars[streamerType]=auto"></script>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '1758271/1_jhjo10ru',
        src: 'https://cdnapisec.kaltura.com/p/1758271/sp/175827100/embedIframeJs/uiconf_id/29300931/partner_id/1758271?entry_id=1_jhjo10ru&flashvars%5BstreamerType%5D=auto&iframeembed=true',
        thumbnail:
          'https://cdnapisec.kaltura.com/p/1758271/thumbnail/entry_id/1_jhjo10ru/width/640',
        width: 560,
        height: 395,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no box where the script names none', async () => {
      const value =
        '<script src="https://cdnapisec.kaltura.com/p/1770401/sp/177040100/embedIframeJs/uiconf_id/31308902/partner_id/1770401?autoembed=true&entry_id=0_y5wm5dnt&playerId=kaltura_player_1525192233"></script>'
      const expected: EmbedResolverResult = {
        provider: 'kaltura',
        id: '1770401/0_y5wm5dnt',
        src: 'https://cdnapisec.kaltura.com/p/1770401/sp/177040100/embedIframeJs/uiconf_id/31308902/partner_id/1770401?entry_id=0_y5wm5dnt&iframeembed=true',
        thumbnail:
          'https://cdnapisec.kaltura.com/p/1770401/thumbnail/entry_id/0_y5wm5dnt/width/640',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the player library script, which embeds nothing by itself', async () => {
      const value =
        '<script src="https://cdnapisec.kaltura.com/p/1758271/sp/175827100/embedIframeJs/uiconf_id/29300931/partner_id/1758271"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a script on a foreign host carrying the same path', async () => {
      const value =
        '<script src="https://evil.test/cdnapisec.kaltura.com/p/1758271/embedIframeJs/uiconf_id/1?autoembed=true&entry_id=1_jhjo10ru"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The player hosts also serve every customer's own media: `playManifest` and `serveFlavor`
// hand out the mp4 and mp3 a podcast feed links as its enclosure. Only the resolver reading
// the entry out of the query keeps those off the resolver, and only this path reaches the
// point where claiming one would cost a reader the file.
describeForEachParser('kaltura through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a kaltura media enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://cdnapisec.kaltura.com/p/1758271/sp/175827100/playManifest/entryId/1_jhjo10ru/format/url/protocol/https/a.mp4',
        type: 'video/mp4',
      },
      {
        url: 'https://api.ca.kaltura.com/p/148/sp/14800/serveFlavor/entryId/0_gs5r8b3x/name/a.mp3',
        type: 'audio/mpeg',
      },
    ]
    const expected = html`
      <video data-enclosure="" controls src="https://cdnapisec.kaltura.com/p/1758271/sp/175827100/playManifest/entryId/1_jhjo10ru/format/url/protocol/https/a.mp4"></video>
      <audio data-enclosure="" controls src="https://api.ca.kaltura.com/p/148/sp/14800/serveFlavor/entryId/0_gs5r8b3x/name/a.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
