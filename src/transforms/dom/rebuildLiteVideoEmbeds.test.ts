import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { rebuildLiteVideoEmbeds } from './rebuildLiteVideoEmbeds.js'

describeForEachParser('rebuildLiteVideoEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLiteVideoEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a lite-youtube element', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('<lite-youtube')
  })

  it('should rebuild an iframe from a lite-vimeo element', async () => {
    const value = html`<lite-vimeo videoid="76979871"></lite-vimeo>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://player.vimeo.com/video/76979871">')
    expect(result).not.toContain('<lite-vimeo')
  })

  it('should leave a lite-youtube element with no videoid alone', async () => {
    const value = html`<lite-youtube></lite-youtube>`
    const result = await transform(value)

    expect(result).toContain('<lite-youtube')
  })

  it('should carry a youtube start offset into a query param', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" start="90"></lite-youtube>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=90">')
  })

  it('should carry a vimeo start offset into a time fragment', async () => {
    const value = html`<lite-vimeo videoid="76979871" start="90"></lite-vimeo>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://player.vimeo.com/video/76979871#t=90s">')
  })

  it('should ignore a non-numeric start', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" start="10&autoplay=1"></lite-youtube>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
  })

  it('should carry videotitle into the iframe title', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" videotitle="Never Gonna Give You Up"></lite-youtube>`
    const result = await transform(value)

    expect(result).toContain('title="Never Gonna Give You Up"')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
  })
})
