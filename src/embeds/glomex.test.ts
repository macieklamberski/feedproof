import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { glomexElementEmbedResolver, glomexIframeEmbedResolver } from './glomex.js'

describeForEachParser('glomexIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, glomexIframeEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the player frame and keep the size the publisher stated', async () => {
      const value = html`
        <iframe
          src="https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-debyi9cki6k1"
          width="640"
          height="350"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599x1hkkig7d8l/v-debyi9cki6k1',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-debyi9cki6k1',
        width: 640,
        height: 350,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state the platform ratio when the carrier states no size', async () => {
      const value = html`
        <iframe
          style="width: 100%; height: 100%;"
          src="https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-debyi9cki6k1"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599x1hkkig7d8l/v-debyi9cki6k1',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-debyi9cki6k1',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should normalize the hydrated iframe-player form onto the integration url', async () => {
      const value = html`
        <iframe
          title="glomex video player"
          src="https://player.glomex.com/integration/1.816.0/iframe-player.html?integrationId=40599x1hkkig7d8l&playlistId=v-cngjz644k31d&origin=glomex-player&playlistIndex=0&pageUrl=https%3A%2F%2Fexample.com%2Fpost"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599x1hkkig7d8l/v-cngjz644k31d',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-cngjz644k31d',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve an integration alone to its own playlist', async () => {
      const value =
        '<iframe src="https://player.glomex.com/integration/1/integration.html?integrationId=eexbs16lxoopubw"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: 'eexbs16lxoopubw',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=eexbs16lxoopubw',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a frame naming no integration', async () => {
      const value =
        '<iframe src="https://player.glomex.com/integration/1/integration.html?playlistId=v-debyi9cki6k1"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the loader script path on the player host', async () => {
      const value =
        '<iframe src="https://player.glomex.com/integration/1/glomex-player.js?integrationId=40599x1hkkig7d8l"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an integration id that could not be one', async () => {
      const value =
        '<iframe src="https://player.glomex.com/integration/1/integration.html?integrationId=../x&playlistId=v-debyi9cki6k1"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('glomexElementEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, glomexElementEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the legacy player element', async () => {
      const value = html`
        <glomex-player
          data-integration-id="40599x1hkkig7d8l"
          data-playlist-id="v-d3gnqat8p95t"
        ></glomex-player>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599x1hkkig7d8l/v-d3gnqat8p95t',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-d3gnqat8p95t',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the integration element', async () => {
      const value = html`
        <glomex-integration
          integration-id="40599v1wl7ixicgx"
          playlist-id="v-dj1dfdsxvsi9"
        ></glomex-integration>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599v1wl7ixicgx/v-dj1dfdsxvsi9',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599v1wl7ixicgx&playlistId=v-dj1dfdsxvsi9',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a hydrated integration that names no playlist', async () => {
      const value = html`
        <glomex-integration
          color-scheme="light"
          integration-id="4059a01ikbaprha9"
        >
          <glomex-player
            act="initially-hidden"
            data-integration-id="4059a01ikbaprha9"
          ></glomex-player>
        </glomex-integration>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '4059a01ikbaprha9',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=4059a01ikbaprha9',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore an integration id that could not be one', async () => {
      const value = html`
        <glomex-player
          data-integration-id="40599x1hkkig7d8l/../evil"
          data-playlist-id="v-d3gnqat8p95t"
        ></glomex-player>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should drop a playlist id that could not be one and keep the integration', async () => {
      const value = html`
        <glomex-player
          data-integration-id="40599x1hkkig7d8l"
          data-playlist-id="v-d3gnqat8p95t?x=1"
        ></glomex-player>
      `
      const expected: EmbedResolverResult = {
        provider: 'glomex',
        id: '40599x1hkkig7d8l',
        src: 'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The element arrives beside the loader script that would have upgraded it. The script is
// stripped and only the pipeline proves the element outlives that and becomes a placeholder.
describeForEachParser('the glomex element the pipeline used to pass through', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }
  const placeholder = async (value: string) => {
    const element = parseHtml(await convert(value)).querySelector('[data-embed-src]')

    return Object.fromEntries(
      [...(element?.attributes ?? [])]
        .filter((attribute) => attribute.name.startsWith('data-embed-'))
        .map((attribute) => [attribute.name, attribute.value]),
    )
  }

  it('should turn the player element and its loader into one placeholder', async () => {
    const value = html`
      <p>Before</p>
      <script src="https://player.glomex.com/integration/1/glomex-player.js"></script>
      <glomex-player
        data-integration-id="40599x1hkkig7d8l"
        data-playlist-id="v-d3gnqat8p95t"
      ></glomex-player>
      <p>After</p>
    `
    const expected = {
      'data-embed-provider': 'glomex',
      'data-embed-id': '40599x1hkkig7d8l/v-d3gnqat8p95t',
      'data-embed-src':
        'https://player.glomex.com/integration/1/integration.html?integrationId=40599x1hkkig7d8l&playlistId=v-d3gnqat8p95t',
      'data-embed-ratio': '16/9',
    }

    expect(await placeholder(value)).toEqual(expected)
    expect(await convert(value)).not.toContain('glomex-player.js')
  })
})
