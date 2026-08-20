import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildLyteEmbeds } from './rebuildLyteEmbeds.js'

describeForEachParser('rebuildLyteEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLyteEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a WYL_ wrapper', async () => {
    const value = html`
      <div
        id="WYL_dQw4w9WgXcQ"
        class="lyMe"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild an iframe from a standalone lyte_ node', async () => {
    const value = '<div id="lyte_dQw4w9WgXcQ"></div>'
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should produce a single iframe for the nested WYL_ / lyte_ pair', async () => {
    const value = html`
      <div
        id="WYL_dQw4w9WgXcQ"
        class="lyMe"
      ><div id="lyte_dQw4w9WgXcQ"></div>
      </div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep an underscore-bearing video id intact', async () => {
    const value = '<div id="WYL_a_b-c123def45"></div>'
    const expected = '<iframe src="https://www.youtube.com/embed/a_b-c123def45"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div
        id="WYL_dQw4w9WgXcQ"
        class="lyMe"
      ></div>
    `
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        data-embed-thumbnail-fallback="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
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
      <div
        id="WYL_dQw4w9WgXcQ"
        class="lyMe"
      ><div id="lyte_dQw4w9WgXcQ"></div>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
