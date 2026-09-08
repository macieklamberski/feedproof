import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { podloveMediaResolver } from './podlove.js'

describeForEachParser('podloveMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podloveMediaResolver)

  describe('happy paths', () => {
    it('should read the audio file and title out of the inlined config', async () => {
      const config = JSON.stringify([
        {
          url: 'https://example.com/wp-json/podlove-web-player/shortcode/publisher/480',
          data: {
            version: 5,
            title: 'Schallwellentherapie',
            poster: 'https://example.com/podlove/image/deadbeef/500/0/0/300hertz',
            audio: [
              {
                url: 'https://example.com/podlove/file/1036/s/webplayer/c/website/E043.mp3',
                size: '141373154',
                title: 'MP3 Audio (mp3)',
                mimeType: 'audio/mpeg',
              },
            ],
          },
        },
      ])
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/podlove/file/1036/s/webplayer/c/website/E043.mp3',
        title: 'Schallwellentherapie',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The config states a poster for the episode and another for the show, and an episode is
    // audio, which HTML gives no poster attribute. Neither reaches a reader, so neither is read.
    it('should state no poster for an episode the config gives one', async () => {
      const config = JSON.stringify([
        {
          data: {
            poster: 'https://example.com/episode.jpg',
            show: { poster: 'https://example.com/show.jpg' },
            audio: [{ url: 'https://example.com/e.mp3', mimeType: 'audio/mpeg' }],
          },
        },
      ])
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.mp3',
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
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
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
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
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
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.opus',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it.todo('should resolve each player when several episodes share one item', () => {
      // Several episodes in one item: each player has its own script, and they are not adjacent.
    })

    it('should emit no poster when the config states none', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'https://example.com/e.mp3', mimeType: 'audio/mpeg' }] } },
      ])
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://example.com/e.mp3',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it.todo('should return undefined when the id names no config entry', () => {
      // The id lookup runs and finds nothing, which is separate from there being no script.
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

    it('should return undefined when the entry is not audio', async () => {
      const config = JSON.stringify([
        { data: { audio: [{ url: 'https://example.com/e.mp4', mimeType: 'video/mp4' }] } },
      ])
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the audio entry states no url', async () => {
      const config = JSON.stringify([{ data: { audio: [{ mimeType: 'audio/mpeg' }] } }])
      const value = html`
        <div
          id="player-6a7b24b4e645d"
          class="podlove-web-player"
        >
          <root>
            <tab-chapters></tab-chapters>
            <subscribe-button></subscribe-button>
          </root>
        </div>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var player = document.getElementById("player-6a7b24b4e645d");
            podlovePlayerCache.add(${config})
          })
        </script>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the player carries no script', async () => {
      const value = '<div class="podlove-web-player"></div>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The resolver alone cannot see either of these. `wrapBareInlineInParagraphs` runs before the
// widget pass and puts a bare script in a `<p>`, so the player's sibling is that paragraph
// rather than the script, and the config states its url the way the markup around it would, so
// only the pipeline gives one a scheme or a base.
describeForEachParser('podlove shapes the pipeline repairs first', (parseHtml) => {
  const convert = (value: string, baseUrl?: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl })
  }

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
    const expected = html`
      <audio
        controls
        src="https://example.com/episode.mp3"
      ></audio>
      <p>
        <script>
          podlovePlayerCache.add(${config})
        </script>
      </p>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // A native <audio> has nowhere to put the episode name, so the pass gives it a figcaption.
  it('should hang the episode title off the player it mints', async () => {
    const config = JSON.stringify([
      {
        data: {
          title: 'Schallwellentherapie',
          audio: [{ url: 'https://example.com/episode.mp3', mimeType: 'audio/mpeg' }],
        },
      },
    ])
    const value = html`
      <div
        id="player-6a7b24b4e645d"
        class="podlove-web-player"
      >
        <root>
          <tab-chapters></tab-chapters>
        </root>
      </div>
      <script>
        podlovePlayerCache.add(${config})
      </script>
    `
    const expected = html`
      <figure>
        <audio
          controls
          src="https://example.com/episode.mp3"
        ></audio>
        <figcaption>Schallwellentherapie</figcaption>
      </figure>
      <p>
        <script>
          podlovePlayerCache.add(${config})
        </script>
      </p>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // The config states the url the way the markup around it would, so it earns the same
  // treatment: a scheme when it names a host, the feed's base when it names a path.
  it('should give a protocol-relative config url a scheme', async () => {
    const config = JSON.stringify([
      { data: { audio: [{ url: '//cdn.example.com/episode.mp3', mimeType: 'audio/mpeg' }] } },
    ])
    const value = html`
      <div class="podlove-web-player"></div>
      <script>
        podlovePlayerCache.add(${config})
      </script>
    `
    const expected = html`
      <audio
        controls
        src="https://cdn.example.com/episode.mp3"
      ></audio>
      <p>
        <script>
          podlovePlayerCache.add(${config})
        </script>
      </p>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  it('should resolve a feed-relative config url against the base', async () => {
    const config = JSON.stringify([
      { data: { audio: [{ url: '/audio/episode.mp3', mimeType: 'audio/mpeg' }] } },
    ])
    const value = html`
      <div class="podlove-web-player"></div>
      <script>
        podlovePlayerCache.add(${config})
      </script>
    `
    const expected = html`
      <audio
        controls
        src="https://example.com/audio/episode.mp3"
      ></audio>
      <p>
        <script>
          podlovePlayerCache.add(${config})
        </script>
      </p>
    `

    expect(await convert(value, 'https://example.com/posts/1')).toEqualHtml(expected)
  })

  // The url is interpolated into the document, so a scriptable one must never reach it.
  it('should build no player from a scriptable url', async () => {
    const config = JSON.stringify([
      { data: { audio: [{ url: 'javascript:alert(1)', mimeType: 'audio/mpeg' }] } },
    ])
    const value = html`
      <div class="podlove-web-player"></div>
      <script>
        podlovePlayerCache.add(${config})
      </script>
    `

    expect(await convert(value)).not.toContain('<audio')
  })

  it('should build no player from a feed-relative url with no base to resolve it', async () => {
    const config = JSON.stringify([
      { data: { audio: [{ url: '/audio/episode.mp3', mimeType: 'audio/mpeg' }] } },
    ])
    const value = html`
      <div class="podlove-web-player"></div>
      <script>
        podlovePlayerCache.add(${config})
      </script>
    `

    expect(await convert(value)).not.toContain('<audio')
  })
})
