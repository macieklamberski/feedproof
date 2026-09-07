import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { surfaceNoscriptEmbeds } from './surfaceNoscriptEmbeds.js'

describeForEachParser('surfaceNoscriptEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceNoscriptEmbeds(baseContext)])
  }

  it('should surface a video iframe trapped in a noscript', async () => {
    const value = html`
      <noscript>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      </noscript>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a Google Tag Manager noscript alone', async () => {
    const value = html`
      <noscript>
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX" height="0" width="0">
        </iframe>
      </noscript>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a noscript without an iframe alone', async () => {
    const value = '<noscript><p>Enable JavaScript</p></noscript>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <noscript>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      </noscript>
    `
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <noscript>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      </noscript>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
