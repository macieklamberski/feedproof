import { expect, it } from 'bun:test'
import { defaultLazyIframeAttributes } from '../../defaults.js'
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
