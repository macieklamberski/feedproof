import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildLazyYtEmbeds } from './rebuildLazyYtEmbeds.js'

describeForEachParser('rebuildLazyYtEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLazyYtEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a lazyYT facade', async () => {
    const value = html`<div class="lazyYT" data-youtube-id="dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('lazyYT')
  })

  it('should keep an underscore-bearing video id intact', async () => {
    const value = html`<div class="lazyYT" data-youtube-id="a_b-c123def45"></div>`
    const result = await transform(value)

    expect(result).toContain('https://www.youtube.com/embed/a_b-c123def45')
  })

  it('should leave a facade with an empty data-youtube-id untouched', async () => {
    const value = html`<div class="lazyYT" data-youtube-id=""></div>`
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
  })

  it('should leave a facade with no data-youtube-id untouched', async () => {
    const value = html`<div class="lazyYT"></div>`
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div
        class="lazyYT"
        data-youtube-id="dQw4w9WgXcQ"
        data-width="480"
        data-height="270"
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result.match(/data-embed-provider="youtube"/g)?.length).toBe(1)
    expect(result).toContain('data-embed-thumbnail')
    expect(result).toContain('data-embed-width="480"')
    expect(result).toContain('data-embed-height="270"')
  })
})
