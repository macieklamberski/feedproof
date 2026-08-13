import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  typeformIframeEmbedResolver,
  typeformResolveEmbed,
  typeformWidgetEmbedResolver,
} from './typeform.js'

describeForEachParser('typeformWidgetEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(typeformWidgetEmbedResolver.selector)

    return element
      ? (typeformWidgetEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  describe('the share panel snippet', () => {
    it('should recover the form and its title from an empty div', () => {
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
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should read the title out of a props string that carries other options', () => {
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

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('the direct widget form', () => {
    it('should recover the form named by its own id', () => {
      const value = html`<div data-tf-widget="MTt3Pw7K"></div>`
      const expected: EmbedResolverResult = {
        provider: 'typeform',
        id: 'MTt3Pw7K',
        src: 'https://form.typeform.com/to/MTt3Pw7K',
        url: 'https://form.typeform.com/to/MTt3Pw7K',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('the legacy typeform-widget class', () => {
    it('should read the form url the older generation carries whole', () => {
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
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('launchers, which were never article content', () => {
    it('should ignore a popup button', () => {
      const value = html`<div data-tf-popup="MTt3Pw7K" data-tf-button-text="Take the survey"></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should ignore a launcher that also carries a live id', () => {
      const value = html`
        <div data-tf-live="01HCZ4DNW8JM6PEGNTQWF2PW87" data-tf-sidetab></div>
      `

      expect(extract(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id outside the url-safe alphabet', () => {
      const value = html`<div data-tf-widget="../evil"></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an empty id', () => {
      const value = html`<div data-tf-widget=""></div>`

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a legacy widget naming another host', () => {
      const value = html`
        <div class="typeform-widget" data-url="https://typeform.com.evil.test/to/MTt3Pw7K"></div>
      `

      expect(extract(value)).toBeUndefined()
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
    expect(typeformResolveEmbed('https://www.typeform.com/explore')).toBeUndefined()
  })

  it('should ignore another host carrying the form path', () => {
    expect(typeformResolveEmbed('https://evil.test/to/MTt3Pw7K')).toBeUndefined()
  })
})

describeForEachParser('typeformIframeEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(typeformIframeEmbedResolver.selector)

    return element
      ? (typeformIframeEmbedResolver.extract(element) as EmbedResolverResult)
      : undefined
  }

  // The size the snippet states stays with the element: convertWidgets reads it off the carrier,
  // from the inline style here and from `width`/`height` elsewhere, so a resolver that repeated
  // it would be the second source of one number.
  it('should resolve the iframe the platform oembed emits, stating no size of its own', () => {
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
    }

    expect(extract(value)).toEqual(expected)
  })

  it('should ignore an iframe on another host', () => {
    const value = html`<iframe src="https://evil.test/to/MTt3Pw7K"></iframe>`

    expect(extract(value)).toBeUndefined()
  })
})
