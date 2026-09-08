import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  brightcoveExperienceEmbedResolver,
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveResolveEmbed,
  brightcoveVideoJsEmbedResolver,
} from './brightcove.js'

describeForEachParser('brightcoveFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveFlashEmbedResolver)

  describe('happy paths', () => {
    it('should read the account from the url and the video id from flashVars', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?isVid=1&publisherID=1660622131"
          flashVars="@videoPlayer=19521637001&playerID=19517958001&domain=embed&"
          width="300"
          height="250"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1660622131/19521637001',
        src: 'https://players.brightcove.net/1660622131/default_default/index.html?videoId=19521637001',
        width: 300,
        height: 250,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The `federated_` path already names the platform, so the id shape is only keeping the two
    // numbers safe to mint with.
    it('should read a short account and video id off a federated player', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9/1951?isVid=1&publisherID=1660"
          flashVars="@videoPlayer=1952&playerID=1951&domain=embed&"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1660/1952',
        src: 'https://players.brightcove.net/1660/default_default/index.html?videoId=1952',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a federated url with no video id anywhere', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9/19517958001?publisherID=1660622131"
        >
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a video id given as an account reference', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9/1?publisherID=1660622131"
          flashVars="@videoPlayer=ref:my-video"
        >
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a brightcove url that is not a federated player', async () => {
      const value = '<embed src="http://admin.brightcove.com/viewer/us1/something.swf">'

      expect(await extract(value)).toBeUndefined()
    })

    // The legacy hosted player page. It is alive and it names its player, but nothing in the
    // url names the account, so there is nothing to mint and the generic placeholder keeps it.
    it('should ignore the hosted link player', async () => {
      const value =
        '<iframe src="https://link.brightcove.com/services/player/bcpid1722935254001?bctid=2932994876001"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  // What most of the corpus's Flash carriers actually write: no `publisherID` and no
  // `@videoPlayer`, so the resolver has to read the older `videoId` and take the account out of
  // the `playerKey`.
  describe('the playerKey era', () => {
    it('should decode the account out of the playerKey and read the older videoId', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9?isVid=1"
          flashVars="videoId=4188894097001&playerID=1464964207001&playerKey=AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs&domain=embed"
          width="486"
          height="412"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1265527910001/4188894097001',
        src: 'https://players.brightcove.net/1265527910001/default_default/index.html?videoId=4188894097001',
        width: 486,
        height: 412,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The `<object>` dialect of the same snippet, where flashVars is a sibling `<param>`.
    it('should read the same configuration out of a param', async () => {
      const value = html`
        <object
          classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
          width="486"
          height="412"
        >
          <param name="movie" value="http://c.brightcove.com/services/viewer/federated_f9?isVid=1">
          <param name="flashVars" value="videoId=4188894097001&playerKey=AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs">
          <embed
            src="http://c.brightcove.com/services/viewer/federated_f9?isVid=1"
            width="486"
            height="412"
          />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1265527910001/4188894097001',
        src: 'https://players.brightcove.net/1265527910001/default_default/index.html?videoId=4188894097001',
        width: 486,
        height: 412,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The same key with `.` for the base64 padding, which is how a percent-encoded flashVars
    // set spells it. Real corpus pair: the decoded account answers 200 on the player host and
    // the account one digit off it 404s.
    it('should decode a playerKey padded with dots instead of tildes', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9?isVid=1"
          flashVars="videoId=3758718092001&playerID=309045659001&playerKey=AQ%2E%2E,AAAAE_Nrlok%2E,_Cvi-4rvLA4_tzdIHBnXT7KyNUAOdmJG"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '85688293001/3758718092001',
        src: 'https://players.brightcove.net/85688293001/default_default/index.html?videoId=3758718092001',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a snippet whose playerKey is the only id it names', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f9?isVid=1"
          flashVars="playerID=1464964207001&playerKey=AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The `playerId` spelling carries no account, so an old snippet naming only that is left to
    // the generic placeholder rather than resolved against a guess.
    it('should ignore a snippet carrying no playerKey', async () => {
      const value = html`
        <embed
          src="http://c.brightcove.com/services/viewer/federated_f8/1569972704"
          flashVars="videoId=49575159001&playerId=1569972704&domain=embed"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('brightcoveResolveEmbed', () => {
  const playerUrl =
    'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432'

  describe('happy paths', () => {
    it('should read the account and video id out of the player url', () => {
      const value = playerUrl
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: playerUrl,
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })

    it('should keep a named player rather than assuming the default', () => {
      const value =
        'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432'
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/AbCdEf123_custom/index.html?videoId=6098765432',
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })

    it('should drop the other player parameters', () => {
      const value = `${playerUrl}&autoplay=true&muted=true`
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: playerUrl,
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })

    // The `players.` host, the `{player}_{embed}` segment and the `videoId` slot already pin the
    // route, so the two numbers need only be safe to mint with.
    it('should read a short account and video id out of the player url', () => {
      const value = 'https://players.brightcove.net/1234/default_default/index.html?videoId=6098'
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234/6098',
        src: 'https://players.brightcove.net/1234/default_default/index.html?videoId=6098',
      }

      expect(brightcoveResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A reference id names the video for the account's own API, not the player.
    it('should return undefined for a reference id', () => {
      const value =
        'https://players.brightcove.net/1234567890/default_default/index.html?videoId=ref:my-video'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined when the url names no video', () => {
      const value = 'https://players.brightcove.net/1234567890/default_default/index.html'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    // `{player}_{embed}` is one segment holding two ids.
    it('should return undefined when the player segment is not a player path', () => {
      const value = 'https://players.brightcove.net/1234567890/index.html?videoId=6098765432'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for another brightcove.net host', () => {
      const value = 'https://studio.brightcove.net/1234567890/default_default/index.html?videoId=1'

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a url that cannot be parsed', () => {
      const value = 'https://['

      expect(brightcoveResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('brightcoveIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveIframeEmbedResolver)

  describe('happy paths', () => {
    it('should claim the player page framed as an ordinary iframe', async () => {
      const value = html`
        <iframe
          src="https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The url reader admits any host starting `players.`, so a lookalike suffixing the whole
    // domain passes it and the resolver's host list is the only thing refusing this.
    it('should ignore a lookalike host suffixing the player domain', async () => {
      const value =
        '<iframe src="https://players.brightcove.net.evil.test/1234567890/default_default/index.html?videoId=6098765432"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    // Brightcove's player is whatever shape the account configured it to be, so the resolver
    // states no size and the box on the carrier is the only measurement there is.
    it('should take the whole box the carrier states', async () => {
      const value = html`
        <iframe
          src="https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432"
          width="640"
          height="360"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

describeForEachParser('brightcoveVideoJsEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveVideoJsEmbedResolver)

  describe('happy paths', () => {
    it('should mint the player page from the element attributes', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-player="AbCdEf"
          data-embed="custom"
          data-video-id="6098765432"
          controls
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/AbCdEf_custom/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should default the player and embed ids when the element omits them', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-video-id="6098765432"
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Some plugins leave the account only in the loader script's url.
    it('should take the account from the loader script when the element has none', async () => {
      const value = html`
        <video-js data-video-id="6098765432"></video-js>
        <script src="https://players.brightcove.net/1234567890/default_default/index.min.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The older Brightcove syntax, and the only shape the 26 corpus feeds shipping the loader
  // without a `<video-js>` element actually use.
  describe('the video element form', () => {
    it('should mint the player page from a video element carrying the same attributes', async () => {
      const value = html`
        <video
          class="video-js"
          data-account="1234567890"
          data-video-id="6098765432"
          controls
        ></video>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A video carrying a real file is a working video, so a placeholder would be a downgrade.
    it('should leave a video element that names a file alone', async () => {
      const value = html`
        <video class="video-js" data-account="1234567890" data-video-id="6098765432">
          <source src="https://example.com/clip.mp4" type="video/mp4">
        </video>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave a video element with its own src alone', async () => {
      const value = html`
        <video
          class="video-js"
          data-account="1234567890"
          data-video-id="6098765432"
          src="https://example.com/clip.mp4"
        ></video>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // Neither attribute is checked the way the two ids are, and unescaped the player id picks
    // the account: `../../999999/stolen` climbs out of the segment it was written into.
    it('should keep a traversing player id inside its own path segment', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-player="../../999999/stolen"
          data-video-id="6098765432"
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/..%2F..%2F999999%2Fstolen_default/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a query the embed id states out of the minted url', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-embed="e?autoplay=1"
          data-video-id="6098765432"
        ></video-js>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1234567890/6098765432',
        src: 'https://players.brightcove.net/1234567890/default_e%3Fautoplay%3D1/index.html?videoId=6098765432',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when no account can be found', async () => {
      const value = '<video-js data-video-id="6098765432"></video-js>'

      expect(await extract(value)).toBeUndefined()
    })

    // Video.js is a library anyone can use, so ids that are not Brightcove-shaped are left to
    // whoever else emitted them.
    it('should return undefined when the video id is not a brightcove id', async () => {
      const value = html`
        <video-js
          data-account="1234567890"
          data-video-id="my-clip"
        ></video-js>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the account is not a brightcove account', async () => {
      const value = html`
        <video-js
          data-account="acme"
          data-video-id="6098765432"
        ></video-js>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The carriers that name Brightcove take any run of digits. This element names nothing, so
    // the floor stands here and hand-numbered ids stay with whoever emitted them.
    it('should return undefined for hand-numbered ids the other carriers would take', async () => {
      const value = html`
        <video-js
          data-account="1234"
          data-video-id="42"
        ></video-js>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The other half of the contract asserted in rebuildVideoJsEmbeds.test.ts: that transform leaves
// a hosted player's element alone, and this is what then claims it. Asserted end to end because
// neither file knows about the other, so nothing but a run proves the two halves meet.
describeForEachParser('brightcove video-js through the pipeline', (parseHtml) => {
  it('should become a placeholder the element alone could not produce', async () => {
    const value = html`
      <video-js
        data-account="1234567890"
        data-video-id="6098765432"
      ></video-js>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    const expected = html`
      <div
        data-embed-src="https://players.brightcove.net/1234567890/default_default/index.html?videoId=6098765432"
        data-embed-provider="brightcove"
        data-embed-id="1234567890/6098765432"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})

describeForEachParser('brightcoveExperienceEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, brightcoveExperienceEmbedResolver)

  describe('happy paths', () => {
    it('should mint the player page from the params alone', async () => {
      const value = html`
        <object
          id="myExperience"
          class="BrightcoveExperience"
          width="638"
          height="361"
        >
          <param name="playerID" value="1464964207001">
          <param name="playerKey" value="AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs">
          <param name="@videoPlayer" value="4188894097001">
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1265527910001/4188894097001',
        src: 'https://players.brightcove.net/1265527910001/default_default/index.html?videoId=4188894097001',
        width: 638,
        height: 361,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match the param name however the publisher cased it', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="PLAYERKEY" value="AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs">
          <param name="@VideoPlayer" value="4188894097001">
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'brightcove',
        id: '1265527910001/4188894097001',
        src: 'https://players.brightcove.net/1265527910001/default_default/index.html?videoId=4188894097001',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A snippet with a player and no video is a channel or playlist player, and there is no
    // single video to resolve it to.
    it('should ignore a player that names no video', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="playerID" value="47620493001">
          <param name="playerKey" value="AQ~~,AAAABvb_NGE~,DMkZt2E6wO0vdNurLWF8tnvuBmrCkhpL">
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a player that names no account', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="playerID" value="1464964207001">
          <param name="@videoPlayer" value="4188894097001">
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a playerKey that is not base64', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="playerKey" value="AQ~~,!!!!,swSdm6mQ">
          <param name="@videoPlayer" value="4188894097001">
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a playerKey that decodes to no brightcove account', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="playerKey" value="AQ~~,AQ~~,swSdm6mQ">
          <param name="@videoPlayer" value="4188894097001">
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a video id given as an account reference', async () => {
      const value = html`
        <object class="BrightcoveExperience">
          <param name="playerKey" value="AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs">
          <param name="@videoPlayer" value="ref:my-video">
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The whole point of this carrier: it names no url at all, so nothing before the widget pass
// can see a player in it, and the loader that once upgraded it builds on hosts that no longer
// resolve. Asserted end to end because the object survives the earlier passes untouched.
describeForEachParser('brightcove experience through the pipeline', (parseHtml) => {
  it('should become a placeholder minted from markup naming no host', async () => {
    const value = html`
      <script src="http://admin.brightcove.com/js/BrightcoveExperiences.js"></script>
      <object class="BrightcoveExperience">
        <param name="playerKey" value="AQ~~,AAABJqdXbnE~,swSdm6mQzrHdUAncp0a9cwAjGy8zF2fs">
        <param name="@videoPlayer" value="4188894097001">
      </object>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    const expected = html`
      <div
        data-embed-src="https://players.brightcove.net/1265527910001/default_default/index.html?videoId=4188894097001"
        data-embed-provider="brightcove"
        data-embed-id="1265527910001/4188894097001"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
