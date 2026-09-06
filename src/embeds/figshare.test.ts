import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { figshareEmbedResolver } from './figshare.js'

describeForEachParser('figshareEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, figshareEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the widget and keep the size the share code stated', async () => {
      const value = html`
        <iframe
          width="568"
          height="351"
          src="https://widgets.figshare.com/articles/21109066/embed?show_title=1"
          allowfullscreen="allowfullscreen"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'figshare',
        id: '21109066',
        src: 'https://widgets.figshare.com/articles/21109066/embed?show_title=1',
        width: 568,
        height: 351,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a widget served from an institutional portal host', async () => {
      const value = '<iframe src="https://wl.figshare.com/articles/6205541/embed"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'figshare',
        id: '6205541',
        src: 'https://wl.figshare.com/articles/6205541/embed',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the article page rather than the widget', async () => {
      const value =
        '<iframe src="https://figshare.com/articles/dataset/rainfall/21109066"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a file download on the platform host', async () => {
      const value = '<iframe src="https://ndownloader.figshare.com/files/37451848"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<iframe src="https://evil.test/widgets.figshare.com/articles/21109066/embed"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
