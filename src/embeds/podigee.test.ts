import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { podigeeResolveEmbed, podigeeScriptEmbedResolver, readPodigeeHeight } from './podigee.js'

describeForEachParser('podigeeScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podigeeScriptEmbedResolver)

  const script = (configuration: string) =>
    `<script class="podigee-podcast-player" src="https://player.podigee-cdn.net/podcast-player/javascripts/podigee-podcast-player.js" data-configuration="${configuration}"></script>`

  describe('happy paths', () => {
    // The loader's data-configuration is the player url itself, so nothing needs executing.
    it('should take the player url from data-configuration', async () => {
      const value = script('https://theshow.podigee.io/42-an-episode/embed?context=external')
      const expected: EmbedResolverResult = {
        provider: 'podigee',
        id: 'theshow/42-an-episode',
        src: 'https://theshow.podigee.io/42-an-episode/embed?context=external',
        height: 145,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for a podigee url naming no episode', async () => {
      const value = script('https://theshow.podigee.io/')

      expect(await extract(value)).toBeUndefined()
    })

    // 14 of 100 corpus feeds point the attribute at an inline config object instead of a url.
    it('should ignore an inline configuration reference', async () => {
      expect(await extract(script('podigee'))).toBeUndefined()
      expect(await extract(script('playerConfiguration'))).toBeUndefined()
    })

    it('should ignore a configuration url on another host', async () => {
      const value = script('https://example.com/player/embed')

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('podigeeResolveEmbed', () => {
  // The episode page is not the player: it redirects to the show's own site, so a carrier
  // framing it shows an article. `/embed` under the same path names the player.
  it.each([
    'https://cloudonaut.podigee.io/72-serverless-and-devops-a-match',
    'https://cloudonaut.podigee.io/72-serverless-and-devops-a-match/embed',
  ])('should mint the player url from %s', (value) => {
    const expected: EmbedResolverResult = {
      provider: 'podigee',
      id: 'cloudonaut/72-serverless-and-devops-a-match',
      src: 'https://cloudonaut.podigee.io/72-serverless-and-devops-a-match/embed',
      height: 145,
    }

    expect(podigeeResolveEmbed(value)).toEqual(expected)
  })

  // A carrier already framing the player is left as the publisher wrote it, so Podigee's own
  // `context=external` survives.
  it('should keep the query on a url that already names the player', () => {
    const value = 'https://cloudonaut.podigee.io/72-an-episode/embed?context=external'
    const expected: EmbedResolverResult = {
      provider: 'podigee',
      id: 'cloudonaut/72-an-episode',
      src: value,
      height: 145,
    }

    expect(podigeeResolveEmbed(value)).toEqual(expected)
  })

  // A `/embed` suffix names the player outright, so the episode needs no number.
  it('should accept an unnumbered episode that already names the player', () => {
    const value = 'https://cloudonaut.podigee.io/an-unnumbered-episode/embed'
    const expected: EmbedResolverResult = {
      provider: 'podigee',
      id: 'cloudonaut/an-unnumbered-episode',
      src: value,
      height: 145,
    }

    expect(podigeeResolveEmbed(value)).toEqual(expected)
  })

  // With anything after `embed` the show serves its website page rather than the player, and the
  // leading segment here is unnumbered, so there is nothing to mint from either.
  it('should return undefined when embed is not the last segment', () => {
    const value = 'https://cloudonaut.podigee.io/an-episode/embed/extra'

    expect(podigeeResolveEmbed(value)).toBeUndefined()
  })

  // A numbered episode still resolves: the trailing junk is dropped with the rebuilt src.
  it('should rebuild the player when a numbered episode carries segments after embed', () => {
    const value = 'https://cloudonaut.podigee.io/72-an-episode/embed/extra'
    const expected: EmbedResolverResult = {
      provider: 'podigee',
      id: 'cloudonaut/72-an-episode',
      src: 'https://cloudonaut.podigee.io/72-an-episode/embed',
      height: 145,
    }

    expect(podigeeResolveEmbed(value)).toEqual(expected)
  })

  describe('hosts that are not a show', () => {
    // The CDN hosts serve the player's assets and the episode audio. An enclosure read as an
    // episode would replace a playable audio element with a placeholder pointing at nothing.
    it.each([
      'https://audio.podigee-cdn.net/2445300-m-a549c8ece885f4e7f31909676891fae8.mp3?source=feed',
      'https://main.podigee-cdn.net/uploads/u123/456-episode.mp3',
      'https://player.podigee-cdn.net/podcast-player/podigee-podcast-player.html',
      'https://www.podigee.com/2024-pricing-update',
    ])('should return undefined for %s', (value) => {
      expect(podigeeResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    // The other two paths a show serves. Every episode segment carries its number and neither
    // of these does, which is what separates them.
    it.each([
      'https://cloudonaut.podigee.io/feed/mp3',
      'https://cloudonaut.podigee.io/',
      'https://cloudonaut.podigee.io/about-the-show',
      'https://example.com/72-not-podigee',
    ])('should return undefined for %s', (value) => {
      expect(podigeeResolveEmbed(value)).toBeUndefined()
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('podigee through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim an episode page framed as an embed', async () => {
    const value = '<iframe src="https://cloudonaut.podigee.io/72-an-episode"></iframe>'

    const expected = html`
      <div
        data-embed-id="cloudonaut/72-an-episode"
        data-embed-provider="podigee"
        data-embed-src="https://cloudonaut.podigee.io/72-an-episode/embed"
        data-embed-height="145"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  it('should leave a podigee audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://audio.podigee-cdn.net/2445300-m-a549c8ece.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://audio.podigee-cdn.net/2445300-m-a549c8ece.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})

describe('readPodigeeHeight', () => {
  it('should read the height out of the player configuration', () => {
    const value = {
      listenTo: 'configurePlayer',
      height: 144.812,
      title: 'Podcast player for episode "Scheiden tut weh - entscheiden auch".',
    }

    expect(readPodigeeHeight(value)).toBe(144.812)
  })

  it('should read nothing before the player has rendered', () => {
    const value = { listenTo: 'configurePlayer', height: 0, title: 'Podcast player' }

    expect(readPodigeeHeight(value)).toBeUndefined()
    expect(readPodigeeHeight({ listenTo: 'loadSubscribeButton' })).toBeUndefined()
  })
})
