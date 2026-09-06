import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { CiteResolverResult } from '../types.js'
import { nytimesCiteResolver } from './nytimes.js'

describeForEachParser('nytimesCiteResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, nytimesCiteResolver)

  describe('happy paths', () => {
    it('should read the article and its title off the card iframe', async () => {
      const value = html`
        <iframe
          title="Putin’s Long War Against American Science"
          src="https://www.nytimes.com/svc/oembed/html/?url=https%3A%2F%2Fwww.nytimes.com%2F2020%2F04%2F13%2Fscience%2Fputin-russia-disinformation-health-coronavirus.html"
          scrolling="no"
          style="border:none;max-width:500px;min-width:300px;min-height:550px;display:block;width:100%;"
        ></iframe>
      `
      const expected: CiteResolverResult = {
        provider: 'nytimes',
        url: 'https://www.nytimes.com/2020/04/13/science/putin-russia-disinformation-health-coronavirus.html',
        title: 'Putin’s Long War Against American Science',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // WordPress sandboxes the card and appends its handshake secret to the url.
    it('should read the card WordPress wrapped', async () => {
      const value = html`
        <iframe
          class="wp-embedded-content"
          sandbox="allow-scripts"
          security="restricted"
          title="British Columbia Wildfire in Photos: ‘A Long-Lasting Scar’"
          src="https://www.nytimes.com/svc/oembed/html/?url=https%3A%2F%2Fwww.nytimes.com%2F2023%2F08%2F19%2Fworld%2Fcanada%2Fcanada-wildfires-british-columbia-kelowna.html#?secret=mDnypfg4do"
          data-secret="mDnypfg4do"
        ></iframe>
      `
      const expected: CiteResolverResult = {
        provider: 'nytimes',
        url: 'https://www.nytimes.com/2023/08/19/world/canada/canada-wildfires-british-columbia-kelowna.html',
        title: 'British Columbia Wildfire in Photos: ‘A Long-Lasting Scar’',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should leave a card stating no title alone', async () => {
      const value = html`
        <iframe
          src="https://www.nytimes.com/svc/oembed/html/?url=https%3A%2F%2Fwww.nytimes.com%2F2016%2F08%2F25%2Fus%2Fdavid-becker-massachusetts-sexual-assault.html"
          scrolling="no"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should refuse a card pointing off the paper', async () => {
      const value = html`
        <iframe
          title="A post"
          src="https://www.nytimes.com/svc/oembed/html/?url=https%3A%2F%2Fexample.com%2Fpost%2F"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = html`
        <iframe
          title="A post"
          src="https://evil.test/www.nytimes.com/svc/oembed/html/?url=https%3A%2F%2Fwww.nytimes.com%2F2020%2F04%2F13%2Fscience%2Fputin.html"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
