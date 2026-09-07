import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { bitchuteEmbedResolver } from './bitchute.js'

describeForEachParser('bitchuteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, bitchuteEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the share snippet player', async () => {
      const value = html`
        <iframe
          width="640"
          height="360"
          scrolling="no"
          frameborder="0"
          style="border: none;"
          src="https://www.bitchute.com/embed/0fRr8eQ5hvv8/"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bitchute',
        id: '0fRr8eQ5hvv8',
        src: 'https://www.bitchute.com/embed/0fRr8eQ5hvv8/',
        url: 'https://www.bitchute.com/video/0fRr8eQ5hvv8/',
        width: 640,
        height: 360,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title the WordPress oEmbed iframe states and drop its query', async () => {
      const value = html`
        <iframe
          loading="lazy"
          class="wp-embedded-content"
          sandbox="allow-scripts"
          security="restricted"
          title="The Currency Act of 1764 The British Law That Started the Revolution"
          width="459"
          height="344"
          src="https://www.bitchute.com/embed/0fRr8eQ5hvv8/?feature=oembed#?secret=ANdifKlIPn"
          data-secret="ANdifKlIPn"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bitchute',
        id: '0fRr8eQ5hvv8',
        src: 'https://www.bitchute.com/embed/0fRr8eQ5hvv8/',
        url: 'https://www.bitchute.com/video/0fRr8eQ5hvv8/',
        title: 'The Currency Act of 1764 The British Law That Started the Revolution',
        width: 459,
        height: 344,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the page url and the old host onto the current player', async () => {
      const value = '<iframe src="https://old.bitchute.com/video/0fRr8eQ5hvv8/"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'bitchute',
        id: '0fRr8eQ5hvv8',
        src: 'https://www.bitchute.com/embed/0fRr8eQ5hvv8/',
        url: 'https://www.bitchute.com/video/0fRr8eQ5hvv8/',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a channel page', async () => {
      const value = '<iframe src="https://www.bitchute.com/channel/QWCuPAXa5iL2/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore an id of the wrong shape', async () => {
      const value = '<iframe src="https://www.bitchute.com/embed/0fRr8eQ5hvv8.mp4/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/bitchute.com/embed/0fRr8eQ5hvv8/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
