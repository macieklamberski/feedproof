import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { odyseeEmbedResolver } from './odysee.js'

describeForEachParser('odyseeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, odyseeEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the channel and claim path and drop the referral token', async () => {
      const value = html`
        <iframe
          id="odysee-iframe"
          style="width:100%; aspect-ratio:16 / 9;"
          src="https://odysee.com/$/embed/@corbettreport:0/webb-repersoning:7?r=J5ihtDQcPiJPQjEXGJApJU1nEbzqhToy"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: '@corbettreport:0/webb-repersoning:7',
        src: 'https://odysee.com/$/embed/@corbettreport:0/webb-repersoning:7',
        url: 'https://odysee.com/@corbettreport:0/webb-repersoning:7',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should decode the path the current share code percent-encodes', async () => {
      const value = html`
        <iframe
          class="arve-iframe fitvidsignore"
          height="675"
          src="https://odysee.com/%24/embed/%40OsasunaLibertad%3A9%2FComo-Proteger-a-los-Menores%3A9?r=8rkFbaDF7G7TfiGmu6r8gNe9ShX86rJ8&autoplay=true"
          width="1200"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: '@OsasunaLibertad:9/Como-Proteger-a-los-Menores:9',
        src: 'https://odysee.com/$/embed/@OsasunaLibertad:9/Como-Proteger-a-los-Menores:9',
        url: 'https://odysee.com/@OsasunaLibertad:9/Como-Proteger-a-los-Menores:9',
        width: 1200,
        height: 675,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title the carrier states', async () => {
      const value = html`
        <iframe
          src="https://odysee.com/$/embed/@Impfschaden.info:0/spirit-of-health-2015-impfen,-ja-oder:0?r=GqtYDFe44PSjFLQNJr5pB38T7AKLg2Tu"
          width="560"
          height="315"
          id="odysee-iframe"
          title="Spirit of Health 2015"
          allowfullscreen="allowfullscreen"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: '@Impfschaden.info:0/spirit-of-health-2015-impfen,-ja-oder:0',
        src: 'https://odysee.com/$/embed/@Impfschaden.info:0/spirit-of-health-2015-impfen,-ja-oder:0',
        url: 'https://odysee.com/@Impfschaden.info:0/spirit-of-health-2015-impfen,-ja-oder:0',
        title: 'Spirit of Health 2015',
        width: 560,
        height: 315,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore an odysee path that is not the player', async () => {
      const value = '<iframe src="https://odysee.com/$/signin"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a claim without a hex id', async () => {
      const value = html`
        <iframe src="https://odysee.com/$/embed/@corbettreport:0/webb-repersoning:zz"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore two claims where the first is not a channel', async () => {
      const value = html`
        <iframe src="https://odysee.com/$/embed/corbettreport:0/webb-repersoning:7"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a path with more segments than a channel and a claim', async () => {
      const value = html`
        <iframe
          src="https://odysee.com/$/embed/@corbettreport:0/webb-repersoning:7/extra:1"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a path that does not decode', async () => {
      const value = '<iframe src="https://odysee.com/$/embed/%E0%A4%A/webb-repersoning:7"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', async () => {
      const value = html`
        <iframe
          src="https://evil.test/odysee.com/$/embed/@corbettreport:0/webb-repersoning:7"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the older spellings of a claim', () => {
    it('should join a legacy name and claim id pair into the page path', async () => {
      const value = html`
        <iframe src="https://odysee.com/$/embed/webb-repersoning/7?sunset=lbrytv"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: 'webb-repersoning:7',
        src: 'https://odysee.com/$/embed/webb-repersoning:7',
        url: 'https://odysee.com/webb-repersoning:7',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a claim without its channel', async () => {
      const value = '<iframe src="https://odysee.com/$/embed/webb-repersoning:7"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: 'webb-repersoning:7',
        src: 'https://odysee.com/$/embed/webb-repersoning:7',
        url: 'https://odysee.com/webb-repersoning:7',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the lbry.tv host onto odysee', async () => {
      const value = html`
        <iframe
          id="lbry-iframe"
          width="560"
          height="315"
          src="https://lbry.tv/$/embed/webb-repersoning/7"
          allowfullscreen
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: 'webb-repersoning:7',
        src: 'https://odysee.com/$/embed/webb-repersoning:7',
        url: 'https://odysee.com/webb-repersoning:7',
        width: 560,
        height: 315,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The same redirect as lbry.tv, and the same repair: the path survives it intact.
    it('should resolve the open.lbry.com host onto odysee', async () => {
      const value = html`
        <iframe src="https://open.lbry.com/$/embed/webb-repersoning/7"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: 'webb-repersoning:7',
        src: 'https://odysee.com/$/embed/webb-repersoning:7',
        url: 'https://odysee.com/webb-repersoning:7',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('a claim named without its id', () => {
    // A name with no claim id addresses the winning claim for that name, which is what the
    // share dialog writes when nothing needs disambiguating.
    it('should resolve a claim named without its id', async () => {
      const value = '<iframe src="https://odysee.com/$/embed/webb-repersoning"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: 'webb-repersoning',
        src: 'https://odysee.com/$/embed/webb-repersoning',
        url: 'https://odysee.com/webb-repersoning',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a channel named without its id', async () => {
      const value = '<iframe src="https://odysee.com/$/embed/@corbettreport"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: '@corbettreport',
        src: 'https://odysee.com/$/embed/@corbettreport',
        url: 'https://odysee.com/@corbettreport',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a channel-scoped claim named without its id', async () => {
      const value = html`
        <iframe src="https://odysee.com/$/embed/@corbettreport:0/webb-repersoning"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'odysee',
        id: '@corbettreport:0/webb-repersoning',
        src: 'https://odysee.com/$/embed/@corbettreport:0/webb-repersoning',
        url: 'https://odysee.com/@corbettreport:0/webb-repersoning',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Two bare segments stay the legacy name-and-id pair rather than becoming two claims, so
    // the fully slash-separated spelling Odysee does not serve is still refused.
    it('should ignore two bare segments that are not a name and a hex id', async () => {
      const value = html`
        <iframe src="https://odysee.com/$/embed/corbettreport/webb-repersoning"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
