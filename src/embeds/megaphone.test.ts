import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractMegaphoneEmbed,
  megaphoneEmbedResolver,
  megaphoneResolveEmbed,
} from './megaphone.js'

describe('extractMegaphoneEmbed', () => {
  it('should read an episode embed', () => {
    const value = 'https://playlist.megaphone.fm?e=AUDD4761726018'
    const expected = {
      param: 'e',
      kind: 'episode',
      id: 'AUDD4761726018',
      height: 200,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })

  it('should read a playlist embed', () => {
    const value = 'https://playlist.megaphone.fm/?p=NSM7546490835&light=true'
    const expected = {
      param: 'p',
      kind: 'playlist',
      id: 'NSM7546490835',
      height: 482,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })

  it('should return undefined when nothing is named', () => {
    const value = 'https://playlist.megaphone.fm/?light=true'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // The parameters on a media url belong to the publisher, not to Megaphone. NPR names its own
  // story in `e` and its programme in `p`, and reading either turns playable audio into a player
  // box for something else.
  it('should not read a publisher parameter off the episode audio', () => {
    const value = 'https://dcs.megaphone.fm/NPR9963319425.mp3?e=nx-s1-5501163&p=510310'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  it('should not read a media url that names no parameter at all', () => {
    const value = 'https://dcs.megaphone.fm/NPR9963319425.mp3'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // The refusal covers every file the reader can already show and not only the playable ones. A
  // picture or a document carrying one of these parameters pays the price audio does: the
  // attachment becomes a click-to-load player box and the file itself never renders.
  it.each([
    'https://dcs.megaphone.fm/ART9963319425.jpg?e=AUDD4761726018',
    'https://traffic.megaphone.fm/cover.png?p=NSM7546490835',
    'https://dcs.megaphone.fm/transcript.pdf?e=AUDD4761726018',
    'https://dcs.megaphone.fm/shownotes.docx?e=AUDD4761726018',
  ])('should not read a publisher parameter off a file url (%s)', (url) => {
    expect(extractMegaphoneEmbed(url)).toBeUndefined()
  })

  // An episode id is letters followed by exactly ten digits, so a bare number is not one.
  it('should not read a bare number as an episode id', () => {
    const value = 'https://playlist.megaphone.fm/?e=510310'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // The prefix is the publisher's own name, so it has no length anyone controls. Both of these
  // are real episodes, confirmed against Megaphone's oEmbed, and a cap at eleven refused them.
  it.each(['NEXOJORNALLTDA1003659364', 'ADSMOVILESPAASL1044003821'])(
    'should read an episode id with a long publisher prefix (%s)',
    (id) => {
      const value = `https://playlist.megaphone.fm/?e=${id}`
      const expected = { param: 'e', kind: 'episode', id, height: 200 }

      expect(extractMegaphoneEmbed(value)).toEqual(expected)
    },
  )

  // Every id in the corpus runs to ten digits, which is Megaphone's generator and not a rule the
  // parameter needs, so the run is not counted.
  it('should read an episode id whose digit run is not ten', () => {
    const value = 'https://playlist.megaphone.fm/?e=GLT46534611423'
    const expected = {
      param: 'e',
      kind: 'episode',
      id: 'GLT46534611423',
      height: 200,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })

  // A playlist is named by a slug, which has no digit grammar to check.
  it('should read a playlist named by a slug', () => {
    const value = 'https://playlist.megaphone.fm/?p=sciencevs'
    const expected = {
      param: 'p',
      kind: 'playlist',
      id: 'sciencevs',
      height: 482,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })
})

describe('megaphoneResolveEmbed', () => {
  it('should size an episode at the episode height', () => {
    const value = 'https://playlist.megaphone.fm?e=AUDD4761726018'
    const expected: EmbedResolverResult = {
      provider: 'megaphone',
      id: 'episode/AUDD4761726018',
      src: 'https://playlist.megaphone.fm/?e=AUDD4761726018',
      height: 200,
    }

    expect(megaphoneResolveEmbed(value)).toEqual(expected)
  })

  // A playlist squeezed into the episode height is the visible failure this separation avoids.
  it('should size a playlist at the taller height', () => {
    const value = 'https://playlist.megaphone.fm/?p=NSM7546490835'
    const expected: EmbedResolverResult = {
      provider: 'megaphone',
      id: 'playlist/NSM7546490835',
      src: 'https://playlist.megaphone.fm/?p=NSM7546490835',
      height: 482,
    }

    expect(megaphoneResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a megaphone url naming no episode', () => {
    const value = 'https://playlist.megaphone.fm/?x=ABC123'

    expect(megaphoneResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('megaphoneEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, megaphoneEmbedResolver)

  describe('happy paths', () => {
    it('should read the player off an iframe carrier', async () => {
      const value = '<iframe src="https://playlist.megaphone.fm/?e=AUDD4761726018"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'megaphone',
        id: 'episode/AUDD4761726018',
        src: 'https://playlist.megaphone.fm/?e=AUDD4761726018',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches every iframe, so the host gate is the only thing that turns
    // this away, and a lookalike is the specimen that reaches it: host matching admits subdomains.
    it('should ignore a lookalike host carrying the player query', async () => {
      const value = '<iframe src="https://megaphone.fm.evil.test/?e=AUDD4761726018"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The two kinds are separated so a playlist is not squeezed into the episode height, but a
    // publisher who stated a box of their own outranks that measurement.
    it('should take the size the carrier states over the height the kind implies', async () => {
      const value = html`
        <iframe
          src="https://playlist.megaphone.fm/?p=NSM7546490835"
          width="640"
          height="200"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'megaphone',
        id: 'playlist/NSM7546490835',
        src: 'https://playlist.megaphone.fm/?p=NSM7546490835',
        width: 640,
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// injectEnclosures offers every attachment to every url-keyed resolver, and megaphone serves the
// episode files from the same domain as the players, so only an enclosure test reaches the path
// where claiming a file url would cost a reader the element they can already see.
describeForEachParser('megaphone through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a megaphone audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://traffic.megaphone.fm/APO1003212054.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://traffic.megaphone.fm/APO1003212054.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })

  it('should leave a megaphone image enclosure an image', async () => {
    const enclosures = [
      { url: 'https://dcs.megaphone.fm/ART9963319425.jpg?e=AUDD4761726018', type: 'image/jpeg' },
    ]

    const expected = html`
      <img data-enclosure="" src="https://dcs.megaphone.fm/ART9963319425.jpg?e=AUDD4761726018">
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })

  // Nothing renders a document, so the reader gets the body alone. That is the point: a placeholder
  // promising a player for a transcript is worse than the attachment going unrendered.
  it('should not turn a megaphone document enclosure into a player', async () => {
    const enclosures = [
      { url: 'https://dcs.megaphone.fm/transcript.pdf?e=AUDD4761726018', type: 'application/pdf' },
    ]

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml('<p>Body</p>')
  })
})
