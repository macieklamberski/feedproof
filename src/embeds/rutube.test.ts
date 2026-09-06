import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { rutubeEmbedResolver, rutubeResolveEmbed } from './rutube.js'

describe('rutubeResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the player url', () => {
      const value = 'https://rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34/'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: 'c91d5d8847c7c5391a090fff38c86f34',
        src: 'https://rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34',
        url: 'https://rutube.ru/video/c91d5d8847c7c5391a090fff38c86f34/',
        ratio: '16/9',
      }

      expect(rutubeResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the access key a private video carries', () => {
      const value =
        'https://rutube.ru/play/embed/08fa24c07c55aa24504f0ac93f7c2d01/?p=KKiFZe0ka-lmMTIbZyvWig'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: '08fa24c07c55aa24504f0ac93f7c2d01',
        src: 'https://rutube.ru/play/embed/08fa24c07c55aa24504f0ac93f7c2d01?p=KKiFZe0ka-lmMTIbZyvWig',
        url: 'https://rutube.ru/video/08fa24c07c55aa24504f0ac93f7c2d01/',
        ratio: '16/9',
      }

      expect(rutubeResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34/'

      expect(rutubeResolveEmbed(value)).toBeUndefined()
    })

    it('should leave the numeric ids of the old player alone', () => {
      const value = 'https://rutube.ru/play/embed/9955425'

      expect(rutubeResolveEmbed(value)).toBeUndefined()
    })

    it('should leave the Flash player alone', () => {
      const value = 'http://video.rutube.ru/2d0970f507fe8ecf63c5e570a2ddc74a'

      expect(rutubeResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore the watch page, which frames nothing', () => {
      const value = 'https://rutube.ru/video/c91d5d8847c7c5391a090fff38c86f34/'

      expect(rutubeResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a playlist route that names no video', () => {
      const value = 'https://rutube.ru/pl/?pl_id=1234&pl_type=user'

      expect(rutubeResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('the routes that redirect onto the player', () => {
    it('should mint the player for the video embed route', () => {
      const value = 'http://rutube.ru/video/embed/1f166e1227ab75d3a14890d5c5bf5e7a'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: '1f166e1227ab75d3a14890d5c5bf5e7a',
        src: 'https://rutube.ru/play/embed/1f166e1227ab75d3a14890d5c5bf5e7a',
        url: 'https://rutube.ru/video/1f166e1227ab75d3a14890d5c5bf5e7a/',
        ratio: '16/9',
      }

      expect(rutubeResolveEmbed(value)).toEqual(expected)
    })

    it('should mint the player for the short embed route', () => {
      const value = 'https://rutube.ru/embed/c4eafc923fb615b68fb3e13d9995d3aa'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: 'c4eafc923fb615b68fb3e13d9995d3aa',
        src: 'https://rutube.ru/play/embed/c4eafc923fb615b68fb3e13d9995d3aa',
        url: 'https://rutube.ru/video/c4eafc923fb615b68fb3e13d9995d3aa/',
        ratio: '16/9',
      }

      expect(rutubeResolveEmbed(value)).toEqual(expected)
    })

    it('should take the video out of the playlist route and drop its own parameters', () => {
      const value = 'https://rutube.ru/pl/?pl_id&pl_type&pl_video=20a54e4a6f61441d808db45f823a7809'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: '20a54e4a6f61441d808db45f823a7809',
        src: 'https://rutube.ru/play/embed/20a54e4a6f61441d808db45f823a7809',
        url: 'https://rutube.ru/video/20a54e4a6f61441d808db45f823a7809/',
        ratio: '16/9',
      }

      expect(rutubeResolveEmbed(value)).toEqual(expected)
    })
  })
})

describeForEachParser('rutubeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, rutubeEmbedResolver)

  describe('happy paths', () => {
    it('should keep the box the share snippet states over the default ratio', async () => {
      const value = html`
        <iframe
          width="720"
          height="405"
          src="https://rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34/"
          allow="clipboard-write; autoplay"
          allowFullScreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: 'c91d5d8847c7c5391a090fff38c86f34',
        src: 'https://rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34',
        url: 'https://rutube.ru/video/c91d5d8847c7c5391a090fff38c86f34/',
        width: 720,
        height: 405,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title and the vertical box a publisher states', async () => {
      const value = html`
        <iframe
          width="461"
          height="819"
          src="https://rutube.ru/embed/c4eafc923fb615b68fb3e13d9995d3aa"
          title="Склад Radaway в Москве"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: 'c4eafc923fb615b68fb3e13d9995d3aa',
        src: 'https://rutube.ru/play/embed/c4eafc923fb615b68fb3e13d9995d3aa',
        url: 'https://rutube.ru/video/c4eafc923fb615b68fb3e13d9995d3aa/',
        title: 'Склад Radaway в Москве',
        width: 461,
        height: 819,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the ratio where the carrier states no size', async () => {
      const value =
        '<iframe src="https://rutube.ru/play/embed/0e7f20a5aedbfbe5630cf9fec649011d/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'rutube',
        id: '0e7f20a5aedbfbe5630cf9fec649011d',
        src: 'https://rutube.ru/play/embed/0e7f20a5aedbfbe5630cf9fec649011d',
        url: 'https://rutube.ru/video/0e7f20a5aedbfbe5630cf9fec649011d/',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/rutube.ru/play/embed/c91d5d8847c7c5391a090fff38c86f34/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave the Flash object alone', async () => {
      const value = html`
        <object
          width="470"
          height="353"
          data="http://video.rutube.ru/2d0970f507fe8ecf63c5e570a2ddc74a"
          type="application/x-shockwave-flash"
        ></object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
