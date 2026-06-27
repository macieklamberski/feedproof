import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { rebuildLyteEmbeds } from './rebuildLyteEmbeds.js'

describeForEachParser('rebuildLyteEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLyteEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a WYL_ wrapper', async () => {
    const value = html`<div id="WYL_dQw4w9WgXcQ" class="lyMe"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('WYL_')
  })

  it('should rebuild an iframe from a standalone lyte_ node', async () => {
    const value = html`<div id="lyte_dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
  })

  it('should produce a single iframe for the nested WYL_ / lyte_ pair', async () => {
    const value = html`<div id="WYL_dQw4w9WgXcQ" class="lyMe"><div id="lyte_dQw4w9WgXcQ"></div></div>`
    const result = await transform(value)

    expect(result.match(/<iframe/g)?.length).toBe(1)
  })

  it('should keep an underscore-bearing video id intact', async () => {
    const value = html`<div id="WYL_a_b-c123def45"></div>`
    const result = await transform(value)

    expect(result).toContain('https://www.youtube.com/embed/a_b-c123def45')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`<div id="WYL_dQw4w9WgXcQ" class="lyMe"></div>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
  })
})
