import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractSimplecastEpisode,
  simplecastEmbedResolver,
  simplecastResolveEmbed,
} from './simplecast.js'

const uuid = '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

describe('extractSimplecastEpisode', () => {
  it('should read the current player uuid', () => {
    const value = `https://player.simplecast.com/${uuid}?dark=false`
    const expected = {
      id: uuid,
      isCurrent: true,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should read the legacy embed id', () => {
    const value = 'https://embed.simplecast.com/a1b2c3d4?color=fff'
    const expected = {
      id: 'a1b2c3d4',
      isCurrent: false,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should read the legacy numeric form', () => {
    const value = 'https://simplecast.com/e/1234567?style=medium'
    const expected = {
      id: '1234567',
      isCurrent: false,
    }

    expect(extractSimplecastEpisode(value)).toEqual(expected)
  })

  it('should return undefined for a simplecast url naming no episode', () => {
    const value = 'https://simplecast.com/pricing'

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })

  it('should return undefined for a simplecast url naming no path', () => {
    const value = 'https://simplecast.com/'

    expect(extractSimplecastEpisode(value)).toBeUndefined()
  })
})

describe('simplecastResolveEmbed', () => {
  // 200 in 75 of 75 sampled corpus iframes.
  it('should state the fixed player height', () => {
    const value = `https://player.simplecast.com/${uuid}`
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: uuid,
      src: `https://player.simplecast.com/${uuid}`,
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the player host from the share host, which names the same uuid', () => {
    const value = `https://play.simplecast.com/${uuid}`
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: uuid,
      src: `https://player.simplecast.com/${uuid}`,
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  // The legacy id is a separate id space: the server maps `fc9a4d22` to a uuid we cannot
  // compute, so the url stands and the iframe follows the redirect itself.
  it('should keep a legacy embed url rather than speak its id to the player host', () => {
    const value = 'https://embed.simplecast.com/a1b2c3d4'
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: 'a1b2c3d4',
      src: 'https://embed.simplecast.com/a1b2c3d4',
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a legacy numeric url', () => {
    const value = 'https://simplecast.com/e/1234567'
    const expected: EmbedResolverResult = {
      provider: 'simplecast',
      id: '1234567',
      src: 'https://simplecast.com/e/1234567',
      height: 200,
    }

    expect(simplecastResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a simplecast url naming no episode', () => {
    const value = 'https://simplecast.com/pricing'

    expect(simplecastResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('simplecastEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, simplecastEmbedResolver)

  describe('happy paths', () => {
    it('should read the player off an iframe carrier', async () => {
      const value =
        '<iframe src="https://player.simplecast.com/7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b?dark=false"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'simplecast',
        id: '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
        src: 'https://player.simplecast.com/7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches every iframe, so the host gate is the only thing that turns
    // this away, and a lookalike is the specimen that reaches it: host matching admits subdomains.
    it('should ignore a lookalike host carrying the episode path', async () => {
      const value = '<iframe src="https://simplecast.com.evil.test/e/1234567"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // 200 is the height every iframe in the corpus sample stated, and a publisher who stated a
    // box of their own still outranks it.
    it('should take the size the carrier states over the fixed player height', async () => {
      const value = html`
        <iframe
          src="https://player.simplecast.com/7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b"
          width="640"
          height="52"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'simplecast',
        id: '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
        src: 'https://player.simplecast.com/7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
        width: 640,
        height: 52,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// injectEnclosures offers every attachment to every url-keyed resolver, and simplecast serves the
// episode audio from the same domain as the players, so only an enclosure test reaches the path
// where claiming a media url would cost a reader a playable element.
describeForEachParser('simplecast through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a simplecast audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://cdn.simplecast.com/audio/47011cc2/014911c0/69a4632d/default_tc.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://cdn.simplecast.com/audio/47011cc2/014911c0/69a4632d/default_tc.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
