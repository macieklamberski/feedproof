import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  typeformIframeEmbedResolver,
  typeformResolveEmbed,
  typeformWidgetEmbedResolver,
} from './typeform.js'

describeForEachParser('typeformWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, typeformWidgetEmbedResolver)

  describe('the share panel snippet', () => {
    it('should recover the form and its title from an empty div', async () => {
      const value = html`
        <div
          data-tf-live="01HCZ4DNW8JM6PEGNTQWF2PW87"
          data-tf-opacity="100"
          data-tf-iframe-props="title=User Satisfaction Survey"
          data-tf-transitive-search-params
          data-tf-medium="snippet"
          style="width:100%;height:500px;"
        ></div>
        <script src="//embed.typeform.com/next/embed.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'typeform',
        id: '01HCZ4DNW8JM6PEGNTQWF2PW87',
        src: 'https://form.typeform.com/to/01HCZ4DNW8JM6PEGNTQWF2PW87',
        url: 'https://form.typeform.com/to/01HCZ4DNW8JM6PEGNTQWF2PW87',
        title: 'User Satisfaction Survey',
        // The snippet's inline style states the height. Its width is a percentage, not pixels.
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the title out of a props string that carries other options', async () => {
      const value = html`
        <div
          data-tf-widget="MTt3Pw7K"
          data-tf-iframe-props="allow=camera,title=Booking Form,referrerpolicy=no-referrer"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'typeform',
        id: 'MTt3Pw7K',
        src: 'https://form.typeform.com/to/MTt3Pw7K',
        url: 'https://form.typeform.com/to/MTt3Pw7K',
        title: 'Booking Form',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the direct widget form', () => {
    it('should recover the form named by its own id', async () => {
      const value = '<div data-tf-widget="MTt3Pw7K"></div>'
      const expected: EmbedResolverResult = {
        provider: 'typeform',
        id: 'MTt3Pw7K',
        src: 'https://form.typeform.com/to/MTt3Pw7K',
        url: 'https://form.typeform.com/to/MTt3Pw7K',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the legacy typeform-widget class', () => {
    it('should read the form url the older generation carries whole', async () => {
      const value = html`
        <div
          class="typeform-widget"
          data-url="https://sessionlab.typeform.com/to/WCfVwJTK"
          data-transparency="50"
          style="width:100%;height:500px;"
        ></div>
        <script src="//embed.typeform.com/embed.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'typeform',
        id: 'WCfVwJTK',
        src: 'https://form.typeform.com/to/WCfVwJTK',
        url: 'https://form.typeform.com/to/WCfVwJTK',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('launchers, which were never article content', () => {
    it('should ignore a popup button', async () => {
      const value = html`
        <div
          data-tf-popup="MTt3Pw7K"
          data-tf-button-text="Take the survey"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a launcher that also carries a live id', async () => {
      const value = html`
        <div
          data-tf-live="01HCZ4DNW8JM6PEGNTQWF2PW87"
          data-tf-sidetab
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id outside the url-safe alphabet', async () => {
      const value = '<div data-tf-widget="../evil"></div>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', async () => {
      const value = '<div data-tf-widget=""></div>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a legacy widget naming another host', async () => {
      const value = html`
        <div
          class="typeform-widget"
          data-url="https://typeform.com.evil.test/to/MTt3Pw7K"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('typeformResolveEmbed', () => {
  it('should resolve the canonical form url', () => {
    const value = 'https://form.typeform.com/to/MTt3Pw7K'
    const expected: EmbedResolverResult = {
      provider: 'typeform',
      id: 'MTt3Pw7K',
      src: value,
      url: value,
    }

    expect(typeformResolveEmbed(value)).toEqual(expected)
  })

  it('should resolve a per-account subdomain to the canonical form url', () => {
    const value = 'https://sessionlab.typeform.com/to/WCfVwJTK'
    const expected: EmbedResolverResult = {
      provider: 'typeform',
      id: 'WCfVwJTK',
      src: 'https://form.typeform.com/to/WCfVwJTK',
      url: 'https://form.typeform.com/to/WCfVwJTK',
    }

    expect(typeformResolveEmbed(value)).toEqual(expected)
  })

  it('should drop the telemetry query the oembed iframe carries', () => {
    const value =
      'https://form.typeform.com/to/MTt3Pw7K?typeform-embed=oembed&typeform-medium=embed'
    const expected: EmbedResolverResult = {
      provider: 'typeform',
      id: 'MTt3Pw7K',
      src: 'https://form.typeform.com/to/MTt3Pw7K',
      url: 'https://form.typeform.com/to/MTt3Pw7K',
    }

    expect(typeformResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a typeform url that names no form', () => {
    const value = 'https://www.typeform.com/explore'

    expect(typeformResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore another host carrying the form path', () => {
    const value = 'https://evil.test/to/MTt3Pw7K'

    expect(typeformResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('typeformIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, typeformIframeEmbedResolver)

  // The snippet states its size in an inline style rather than in width/height attributes, and
  // the resolver reads both.
  it('should resolve the iframe the platform oembed emits, carrying its stated size', async () => {
    const value = html`
      <iframe
        src="https://form.typeform.com/to/MTt3Pw7K?typeform-embed=oembed&amp;typeform-medium=embed-oembed"
        style="border: 0; width: 900px; height: 600px;"
        allowfullscreen
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'typeform',
      id: 'MTt3Pw7K',
      src: 'https://form.typeform.com/to/MTt3Pw7K',
      url: 'https://form.typeform.com/to/MTt3Pw7K',
      width: 900,
      height: 600,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore an iframe on another host', async () => {
    const value = '<iframe src="https://evil.test/to/MTt3Pw7K"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
