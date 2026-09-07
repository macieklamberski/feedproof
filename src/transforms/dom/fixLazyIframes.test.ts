import { expect, it } from 'bun:test'
import { defaultLazyIframeAttributes } from '../../defaults.js'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixLazyIframes } from './fixLazyIframes.js'

describeForEachParser('fixLazyIframes', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [fixLazyIframes(context)])
  }

  // Iterates the real default list, so every entry is exercised and a new entry
  // is covered automatically.
  it.each(defaultLazyIframeAttributes)('should promote %s into src', async (attribute) => {
    const value = `<iframe src="" ${attribute}="https://example.com/embed/x"></iframe>`
    const expected = `<iframe src="https://example.com/embed/x" ${attribute}="https://example.com/embed/x"></iframe>`

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote a lazy attribute into an iframe with no src', async () => {
    const value = '<iframe id="_ytid_27860" data-orig="https://www.youtube.com/embed/x"></iframe>'
    const expected = html`
      <iframe
        src="https://www.youtube.com/embed/x"
        id="_ytid_27860"
        data-orig="https://www.youtube.com/embed/x"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // Real Cookie Banner parks the plain URL and an autoplay=1 variant on the same iframe. The
  // list order makes the plain one win even when the click variant comes first in the markup.
  it('should prefer the non-autoplay URL when both consent attributes are parked', async () => {
    const value = html`
      <iframe
        consent-click-original-src-_="https://www.youtube.com/embed/x?feature=oembed&autoplay=1"
        consent-original-src-_="https://www.youtube.com/embed/x?feature=oembed"
        width="750"
        height="422"
        allowfullscreen
      ></iframe>
    `
    const expected = html`
      <iframe
        src="https://www.youtube.com/embed/x?feature=oembed"
        consent-click-original-src-_="https://www.youtube.com/embed/x?feature=oembed&autoplay=1"
        consent-original-src-_="https://www.youtube.com/embed/x?feature=oembed"
        width="750"
        height="422"
        allowfullscreen
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote over the Invision interface placeholder src', async () => {
    const value = html`
      <iframe
        src="https://forum.example.com/applications/core/interface/index.html"
        data-embed-src="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `
    const expected = html`
      <iframe
        src="https://www.youtube.com/embed/x?feature=oembed"
        data-embed-src="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote over the Invision spacer image src', async () => {
    const value = html`
      <iframe
        width="480"
        height="270"
        src="https://forum.example.com/applications/core/interface/js/spacer.png"
        data-embed-src="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `
    const expected = html`
      <iframe
        width="480"
        height="270"
        src="https://www.youtube.com/embed/x?feature=oembed"
        data-embed-src="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote over the Complianz placeholder video src', async () => {
    const value = html`
      <iframe
        src="https://site.example/wp-content/plugins/complianz-gdpr/assets/video/youtube-placeholder.mp4?cmplz=1"
        data-src-cmplz="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `
    const expected = html`
      <iframe
        src="https://www.youtube.com/embed/x?feature=oembed"
        data-src-cmplz="https://www.youtube.com/embed/x?feature=oembed"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The parked url never went through resolveRelativeUrls, so it is resolved here instead.
  it('should give a protocol-relative parked url its scheme', async () => {
    const value = html`
      <iframe
        class="cmplz-placeholder-element cmplz-iframe cmplz-video cmplz-hidden"
        data-src-cmplz="//player.vimeo.com/video/41629603"
        src="about:blank"
        width="1280"
        height="720"
      ></iframe>
    `
    const expected = html`
      <iframe
        class="cmplz-placeholder-element cmplz-iframe cmplz-video cmplz-hidden"
        data-src-cmplz="//player.vimeo.com/video/41629603"
        src="https://player.vimeo.com/video/41629603"
        width="1280"
        height="720"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve a feed-relative parked url against the base', async () => {
    const value = '<iframe src="about:blank" data-src="/embed/x"></iframe>'
    const context: TransformContext = { ...baseContext, baseUrl: 'https://example.com/post' }
    const expected = html`
      <iframe
        src="https://example.com/embed/x"
        data-src="/embed/x"
      ></iframe>
    `

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should leave the Invision placeholder src when nothing is parked', async () => {
    const value = html`
      <iframe src="https://forum.example.com/applications/core/interface/index.html"></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not overwrite a usable src', async () => {
    const value = html`
      <iframe src="https://example.com/real" data-src="https://example.com/lazy"></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an empty iframe with no recoverable attribute', async () => {
    const value = '<iframe src="about:blank"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should ignore flag-style values that are not URL-shaped', async () => {
    const value = '<iframe src="about:blank" data-src="loaded"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<iframe src="about:blank" data-src="https://example.com/embed/x"></iframe>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})

// The parked url only reaches a provider's resolver once it carries a host, which is what the
// pipeline proves: the same Complianz carrier used to end as a provider-less placeholder.
describeForEachParser('fixLazyIframes through the pipeline', (parseHtml) => {
  it('should let the provider claim a protocol-relative parked url', async () => {
    const value = html`
      <iframe
        class="cmplz-placeholder-element cmplz-iframe cmplz-video cmplz-hidden"
        data-src-cmplz="//player.vimeo.com/video/41629603"
        src="about:blank"
        width="1280"
        height="720"
      ></iframe>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })
    const expected = html`
      <div
        data-embed-src="https://player.vimeo.com/video/41629603"
        data-embed-provider="vimeo"
        data-embed-id="41629603"
        data-embed-url="https://vimeo.com/41629603"
        data-embed-width="1280"
        data-embed-height="720"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
