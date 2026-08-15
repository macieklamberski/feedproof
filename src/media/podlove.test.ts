import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { podloveMediaResolver } from './podlove.js'

// The corpus shape: a player div of custom elements, then a script carrying the whole config.
const makePlayer = (config: string, playerId = 'player-6a7b24b4e645d'): string => {
  return html`
    <div id="${playerId}" class="podlove-web-player">
      <root>
        <tab-chapters></tab-chapters>
        <subscribe-button></subscribe-button>
      </root>
    </div>
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        var player = document.getElementById("${playerId}");
        podlovePlayerCache.add(${config})
      })
    </script>
  `
}

const episodeConfig = JSON.stringify([
  {
    url: 'https://300hertz.de/wp-json/podlove-web-player/shortcode/publisher/480',
    data: {
      version: 5,
      title: 'Schallwellentherapie',
      poster: 'https://300hertz.de/podlove/image/deadbeef/500/0/0/300hertz',
      audio: [
        {
          url: 'https://300hertz.de/podlove/file/1036/s/webplayer/c/website/300Hertz_E043.mp3',
          size: '141373154',
          title: 'MP3 Audio (mp3)',
          mimeType: 'audio/mpeg',
        },
      ],
    },
  },
])

describeForEachParser('podloveMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podloveMediaResolver)

  describe('happy paths', () => {
    it('should read the audio file and poster out of the inlined config', async () => {
      const value = makePlayer(episodeConfig)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://300hertz.de/podlove/file/1036/s/webplayer/c/website/300Hertz_E043.mp3',
        poster: 'https://300hertz.de/podlove/image/deadbeef/500/0/0/300hertz',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the show poster when the episode has none', async () => {
      const config = JSON.stringify([
        {
          data: {
            show: { poster: 'https://example.com/show.jpg' },
            audio: [{ url: 'https://example.com/e.mp3', mimeType: 'audio/mpeg' }],
          },
        },
      ])
      const value = makePlayer(config)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.mp3',
        poster: 'https://example.com/show.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the first audio entry when several formats are offered', async () => {
      const config = JSON.stringify([
        {
          data: {
            audio: [
              { url: 'https://example.com/e.mp3', mimeType: 'audio/mpeg' },
              { url: 'https://example.com/e.opus', mimeType: 'audio/opus' },
            ],
          },
        },
      ])
      const value = makePlayer(config)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.mp3',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Safari plays neither, so the order the publisher chose must not decide the file.
    it('should skip ogg and opus for a widely playable format listed after them', async () => {
      const config = JSON.stringify([
        {
          data: {
            audio: [
              { url: 'https://example.com/e.opus', mimeType: 'audio/opus' },
              { url: 'https://example.com/e.oga', mimeType: 'audio/ogg' },
              { url: 'https://example.com/e.m4a', mimeType: 'audio/mp4' },
            ],
          },
        },
      ])
      const value = makePlayer(config)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.m4a',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Nothing preferred is on offer, so the config's own order stands.
    it('should fall back to the first entry when no preferred format is offered', async () => {
      const config = JSON.stringify([
        {
          data: {
            audio: [
              { url: 'https://example.com/e.opus', mimeType: 'audio/opus' },
              { url: 'https://example.com/e.oga', mimeType: 'audio/ogg' },
            ],
          },
        },
      ])
      const value = makePlayer(config)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.opus',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Several episodes in one item: each player has its own script, and they are not adjacent.
    it('should find the config by player id when the script is not the next sibling', async () => {
      const value = html`
        <div>
          <div id="player-one" class="podlove-web-player"></div>
          <p>Prose between the player and its script.</p>
          <script>
            var player = document.getElementById("player-one");
            podlovePlayerCache.add([{"data":{"audio":[{"url":"https://example.com/one.mp3","mimeType":"audio/mpeg"}]}}])
          </script>
        </div>
      `
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/one.mp3',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should emit no poster when the config states none', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'https://example.com/e.mp3', mimeType: 'audio/mpeg' }] } },
      ])
      const value = makePlayer(config)
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.mp3',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('rejections', () => {
    // The id lookup runs and finds nothing, which is separate from there being no script.
    it('should return undefined when no sibling script names the player', async () => {
      const value = html`
        <div>
          <div id="player-three" class="podlove-web-player"></div>
          <p>Prose between the player and an unrelated script.</p>
          <script>console.log("some other widget")</script>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The endpoint spelling: a config url with no data, which would need a fetch.
    it('should return undefined for the fetch-based player form', async () => {
      const value = html`
        <div id="player-two" class="podlove-web-player"></div>
        <script>
          podlovePlayer("#player-two", "https://example.com/wp-json/podlove-web-player/480")
        </script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the config is malformed json', async () => {
      const value = html`
        <div class="podlove-web-player"></div>
        <script>podlovePlayerCache.add([{"data":{"audio":[}])</script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when no audio entry names a file', async () => {
      const config = JSON.stringify([{ data: { audio: [{ mimeType: 'audio/mpeg' }] } }])
      const value = makePlayer(config)

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the entry is not audio', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'https://example.com/e.mp4', mimeType: 'video/mp4' }] } },
      ])
      const value = makePlayer(config)

      expect(await extract(value)).toBeUndefined()
    })

    // The url is interpolated into the document, so a relative or scriptable value is dropped.
    it('should return undefined for a url that is not absolute', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'javascript:alert(1)', mimeType: 'audio/mpeg' }] } },
      ])
      const value = makePlayer(config)

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the player carries no script', async () => {
      const value = html`<div class="podlove-web-player"></div>`

      expect(await extract(value)).toBeUndefined()
    })
  })

  // The resolver alone cannot see this. `wrapBareInlineInParagraphs` runs before the widget
  // pass and puts the bare script in a `<p>`, so the player's sibling is that paragraph rather
  // than the script, and a player carrying no id has no other route to its config.
  describe('through the pipeline', () => {
    it('should recover an episode whose script the paragraph pass has wrapped', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'https://example.com/episode.mp3', mimeType: 'audio/mpeg' }] } },
      ])
      const value = html`
        <div class="podlove-web-player"></div>
        <script>
          podlovePlayerCache.add(${config})
        </script>
      `
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toContainHtml('<audio src="https://example.com/episode.mp3" controls></audio>')
    })
  })
})
