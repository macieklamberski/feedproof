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
    const value = html`<noscript><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></noscript>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('<noscript')
  })

  it('should leave a Google Tag Manager noscript alone', async () => {
    const value = html`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX" height="0" width="0"></iframe></noscript>`
    const result = await transform(value)

    expect(result).toContain('<noscript')
    expect(result).toContain('googletagmanager.com')
  })

  it('should leave a noscript without an iframe alone', async () => {
    const value = html`<noscript><p>Enable JavaScript</p></noscript>`
    const result = await transform(value)

    expect(result).toContain('<noscript')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`<noscript><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></noscript>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).not.toContain('<noscript')
  })
})
