import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractSpreakerEmbed,
  spreakerAnchorEmbedResolver,
  spreakerResolveEmbed,
} from './spreaker.js'

describe('extractSpreakerEmbed', () => {
  it('should read an episode player', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark&playlist=false'
    const expected = {
      kind: 'episode',
      param: 'episode_id',
      id: '52842990',
    }

    expect(extractSpreakerEmbed(value)).toEqual(expected)
  })

  it('should read a show player', () => {
    const value = 'https://widget.spreaker.com/player?show_id=1234567'
    const expected = {
      kind: 'show',
      param: 'show_id',
      id: '1234567',
    }

    expect(extractSpreakerEmbed(value)).toEqual(expected)
  })

  it('should return undefined when the player names nothing', () => {
    const value = 'https://widget.spreaker.com/player?theme=dark'

    expect(extractSpreakerEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a spreaker url that is not a player', () => {
    const value = 'https://www.spreaker.com/show/some-show'

    expect(extractSpreakerEmbed(value)).toBeUndefined()
  })

  // This route is gone: it answers 404 for a live episode id and for a fabricated one alike,
  // while the widget host serves the same id. So reading it repairs dead markup rather than
  // passing a working url through.
  it('should read the site host embed route', () => {
    const value = 'https://www.spreaker.com/embed/player/mini?episode_id=4901266'
    const expected = {
      kind: 'episode',
      param: 'episode_id',
      id: '4901266',
    }

    expect(extractSpreakerEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a segment that merely starts with the player route', () => {
    const value = 'https://www.spreaker.com/user/foo/players?episode_id=42'

    expect(extractSpreakerEmbed(value)).toBeUndefined()
  })
})

describe('spreakerResolveEmbed', () => {
  // The corpus iframes carry no height at all, so stating Spreaker's documented 200 is what a
  // reader gains beyond the provider label.
  it('should mint the episode page and state the documented height', () => {
    const value = 'https://widget.spreaker.com/player?episode_id=52842990&theme=dark'
    const expected: EmbedResolverResult = {
      provider: 'spreaker',
      id: 'episode/52842990',
      src: 'https://widget.spreaker.com/player?episode_id=52842990',
      url: 'https://www.spreaker.com/episode/52842990',
      height: 200,
    }

    expect(spreakerResolveEmbed(value)).toEqual(expected)
  })

  it('should mint the show page for a show player', () => {
    const value = 'https://widget.spreaker.com/player?show_id=1433865'
    const expected: EmbedResolverResult = {
      provider: 'spreaker',
      id: 'show/1433865',
      src: 'https://widget.spreaker.com/player?show_id=1433865',
      url: 'https://www.spreaker.com/show/1433865',
      height: 200,
    }

    expect(spreakerResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a spreaker url naming no episode', () => {
    const value = 'https://widget.spreaker.com/player?x=1'

    expect(spreakerResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('spreakerAnchorEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, spreakerAnchorEmbedResolver)

  describe('happy paths', () => {
    // The corpus shape: the loader swaps this anchor for the player, so without it a reader sees
    // the fallback text and nothing else.
    it('should read the episode out of data-resource', async () => {
      const value = html`
        <a
          class="spreaker-player"
          href="https://www.spreaker.com/episode/42"
          data-resource="episode_id=42"
        >Listen to "An episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The href names the show while the resource names an episode, which is where taking the
    // click target off the anchor answers with the wrong page rather than with none.
    it('should mint the page from the resource rather than from the href', async () => {
      const value = html`
        <a
          class="spreaker-player"
          href="https://www.spreaker.com/show/1433865"
          data-resource="episode_id=42"
        >Listen to "An episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a show resource', async () => {
      const value = html`
        <a
          class="spreaker-player"
          href="https://www.spreaker.com/episode/42"
          data-resource="show_id=99"
        >Listen to "A show" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'show/99',
        src: 'https://widget.spreaker.com/player?show_id=99',
        url: 'https://www.spreaker.com/show/99',
        height: 200,
        title: 'A show',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the name from data-title when the anchor states one', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
          data-title="An episode"
        >Listen to "Something else" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The publisher sized this one, so their height wins over the documented constant.
    it('should prefer the stated data-height', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
          data-height="350px"
        >Listen to "An episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 350,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should accept a bare pixel count', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
          data-height="120"
        >Listen to "An episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 120,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should keep the constant when data-height is not a pixel count', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
          data-height="100%"
        >Listen to "An episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
        title: 'An episode',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should return undefined when the resource names no id', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=abc"
        >Listen to "An episode" on Spreaker.</a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // A user player is documented and dead, and nothing else names a resource this resolver
    // can place, so the anchor is left as the working link it already is.
    it('should return undefined for an unknown resource kind', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="user_id=8114541"
        >Listen to "An episode" on Spreaker.</a>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The class is styling anyone can copy and the anchor already works as a link, so an
    // anchor without the attribute stays a link.
    it('should not match an anchor carrying the class alone', () => {
      const value = html`
      <a class="spreaker-player" href="https://www.spreaker.com/episode/42">Listen.</a>
    `

      expect(parseHtml(value).querySelector(spreakerAnchorEmbedResolver.selector)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should state no title for an anchor carrying no text', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
        ></a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no title when the text quotes nothing', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
        >Listen on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // Spreaker writes the sentence in the publisher's own language and quotes the episode name
  // with whichever pair that language uses, so the quotes are the only part of it every card
  // has in common.
  describe('the localized call to action', () => {
    it('should read a Spanish name out of straight quotes', async () => {
      const value = html`
        <a
          class="spreaker-player"
          href="https://www.spreaker.com/user/freerockfm/fr-433-270418-incognito-pd-cs-pod"
          data-resource="episode_id=14653675"
          data-height="400px"
        >Escucha"FREEROCK #433 270418 INCOGNITO-PAJARO DIABLO" en Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/14653675',
        src: 'https://widget.spreaker.com/player?episode_id=14653675',
        url: 'https://www.spreaker.com/episode/14653675',
        height: 400,
        title: 'FREEROCK #433 270418 INCOGNITO-PAJARO DIABLO',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a name out of curly quotes', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=69236207"
        >Listen to “306. Italy Ancestry Research Tips and Travel Stories” on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/69236207',
        src: 'https://widget.spreaker.com/player?episode_id=69236207',
        url: 'https://www.spreaker.com/episode/69236207',
        height: 200,
        title: '306. Italy Ancestry Research Tips and Travel Stories',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a name that quotes something itself', async () => {
      const value = html`
        <a
          class="spreaker-player"
          data-resource="episode_id=42"
        >Listen to "The "best" episode" on Spreaker.</a>
      `
      const expected: EmbedResolverResult = {
        provider: 'spreaker',
        id: 'episode/42',
        src: 'https://widget.spreaker.com/player?episode_id=42',
        url: 'https://www.spreaker.com/episode/42',
        height: 200,
        title: 'The "best" episode',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// `api.spreaker.com` is a subdomain of the host the url resolver claims and every episode's
// audio is served from it, so this is the path where claiming one would cost a reader the audio.
describeForEachParser('spreaker through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a spreaker audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://api.spreaker.com/download/episode/25675659/7559816.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio data-enclosure="" controls src="https://api.spreaker.com/download/episode/25675659/7559816.mp3"></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
