import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { arteEmbedResolver } from './arte.js'

describeForEachParser('arteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, arteEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the share snippet and take the title and box it states', async () => {
      const value = html`
        <iframe
          title="Tracks 2022 - Marchand &amp; Meffre"
          allowfullscreen="true"
          style="transition-duration:0;transition-property:no;margin:0 auto;position:relative;display:block;background-color:#000000;"
          frameborder="0"
          scrolling="no"
          width="640"
          height="360"
          src="https://www.arte.tv/embeds/fr/095172-005-A?autoplay=true&amp;mute=0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'fr/095172-005-A',
        src: 'https://www.arte.tv/embeds/fr/095172-005-A',
        url: 'https://www.arte.tv/fr/videos/095172-005-A/',
        title: 'Tracks 2022 - Marchand & Meffre',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state the ratio for the snippet sized in percent only', async () => {
      const value = html`
        <iframe
          allowfullscreen="true"
          frameborder="0"
          scrolling="no"
          width="100%"
          height="100%"
          src="https://www.arte.tv/embeds/de/119473-012-A"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'de/119473-012-A',
        src: 'https://www.arte.tv/embeds/de/119473-012-A',
        url: 'https://www.arte.tv/de/videos/119473-012-A/',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/www.arte.tv/embeds/fr/095172-005-A"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a language the player does not serve', async () => {
      const value = '<iframe src="https://www.arte.tv/embeds/xx/095172-005-A"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an id outside the program shape', async () => {
      const value = '<iframe src="https://www.arte.tv/embeds/fr/095172-005"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an arte url that is not the player', async () => {
      const value = html`
        <iframe src="https://www.arte.tv/fr/videos/095172-005-A/tracks-marchand-meffre/"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  // Each generation of the retired player took the program as a config url in `json_url`, and
  // all of them resolve to the current embed.
  describe('the retired players', () => {
    it('should read the program off the v7 player config', async () => {
      const value = html`
        <iframe
          allowfullscreen="true"
          frameborder="0"
          scrolling="no"
          width="100%"
          height="100%"
          src="https://www.arte.tv/player/v7/index.html?json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv2%2Fconfig%2Fde%2F115775-001-A&amp;lang=de"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'de/115775-001-A',
        src: 'https://www.arte.tv/embeds/de/115775-001-A',
        url: 'https://www.arte.tv/de/videos/115775-001-A/',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the program off the v5 player config', async () => {
      const value = html`
        <iframe
          title="360° GEO: París, Blitz Motorcycle"
          frameborder="0"
          scrolling="no"
          width="640"
          height="360"
          src="https://www.arte.tv/player/v5/index.php?lang=es_ES&amp;json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv2%2Fconfig%2Fes%2F051485-024-A&amp;autostart=false&amp;mute=0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'es/051485-024-A',
        src: 'https://www.arte.tv/embeds/es/051485-024-A',
        url: 'https://www.arte.tv/es/videos/051485-024-A/',
        title: '360° GEO: París, Blitz Motorcycle',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the program off the v3 player config that carries its own query', async () => {
      const value = html`
        <iframe
          frameborder="0"
          scrolling="no"
          width="640"
          height="360"
          src="https://www.arte.tv/player/v3/index.php?json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv1%2Fconfig%2Ffr%2F025816-000-A%3Fautostart%3D0%26lifeCycle%3D1&amp;lang=fr_FR&amp;mute=0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'fr/025816-000-A',
        src: 'https://www.arte.tv/embeds/fr/025816-000-A',
        url: 'https://www.arte.tv/fr/videos/025816-000-A/',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the program off the unversioned player the others redirect to', async () => {
      const value = html`
        <iframe src="https://www.arte.tv/player/index.html?json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv2%2Fconfig%2Ffr%2F090637-075-A&amp;lang=fr"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'arte',
        id: 'fr/090637-075-A',
        src: 'https://www.arte.tv/embeds/fr/090637-075-A',
        url: 'https://www.arte.tv/fr/videos/090637-075-A/',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a player naming no config', async () => {
      const value = '<iframe src="https://www.arte.tv/player/v5/index.php?lang=fr"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a config on a foreign host', async () => {
      const value = html`
        <iframe src="https://www.arte.tv/player/v5/index.php?json_url=https%3A%2F%2Fevil.test%2Fapi%2Fplayer%2Fv2%2Fconfig%2Ffr%2F090637-075-A"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the concert player config that names no program', async () => {
      const value = html`
        <iframe src="https://www.arte.tv/player/v3/index.php?json_url=http%3A%2F%2Fconcert.arte.tv%2Ffr%2Fplayer%2F48551&amp;lang=fr_FR"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an api url that is not the player config', async () => {
      const value = html`
        <iframe src="https://www.arte.tv/player/v5/index.php?json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv2%2Fplaylist%2Ffr%2F090637-075-A"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
