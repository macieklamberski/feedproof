import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapDrupalOembedIframes } from './unwrapDrupalOembedIframes.js'

describeForEachParser('unwrapDrupalOembedIframes', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [unwrapDrupalOembedIframes(baseContext)])
  }

  it('should point the iframe at the page url the route wraps', async () => {
    const value = html`
      <iframe
        width="800"
        height="450"
        class="media-oembed-content"
        loading="eager"
        title="Best of the show"
        src="https://www.example.com/media/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D2dEj10uaqAs%26pp%3DygUebWluZHk&amp;max_width=0&amp;max_height=0&amp;hash=sy5_ZDQX3OKGpwRbTfis9dI444vDFvAHyhc7Lyzsy_Q"
      ></iframe>
    `
    const expected = html`
      <iframe
        width="800"
        height="450"
        class="media-oembed-content"
        loading="eager"
        title="Best of the show"
        src="https://www.youtube.com/watch?v=2dEj10uaqAs&amp;pp=ygUebWluZHk"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a route whose url is not an http url', async () => {
    const value = html`
      <iframe src="https://www.example.com/media/oembed?url=javascript%3Aalert(1)&amp;hash=abc"></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a route naming no url', async () => {
    const value = html`
      <iframe src="https://www.example.com/media/oembed?max_width=0&amp;hash=abc"></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an iframe on another path carrying a url parameter', async () => {
    const value = html`
      <iframe src="https://www.example.com/player?url=https%3A//www.youtube.com/watch%3Fv%3D2dEj10uaqAs"></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <iframe src="https://www.example.com/media/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D2dEj10uaqAs&amp;hash=abc"></iframe>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})

// The unwrapped url is a watch page, which only the provider resolver turns into a player, so
// the pipeline is what shows the frame ending up as a YouTube placeholder with its poster.
describeForEachParser('unwrapDrupalOembedIframes through the pipeline', (parseHtml) => {
  it('should let the provider claim the wrapped page', async () => {
    const value = html`
      <iframe
        width="800"
        height="450"
        class="media-oembed-content"
        src="https://www.example.com/media/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D2dEj10uaqAs&amp;max_width=0&amp;max_height=0&amp;hash=sy5_ZDQX3OKGpwRbTfis9dI444vDFvAHyhc7Lyzsy_Q"
      ></iframe>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/2dEj10uaqAs"
        data-embed-provider="youtube"
        data-embed-id="2dEj10uaqAs"
        data-embed-url="https://www.youtube.com/watch?v=2dEj10uaqAs"
        data-embed-thumbnail="https://i.ytimg.com/vi/2dEj10uaqAs/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(result).toEqualHtml(expected)
  })
})
