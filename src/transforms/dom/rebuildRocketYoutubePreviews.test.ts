import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { rebuildRocketYoutubePreviews } from './rebuildRocketYoutubePreviews.js'

describeForEachParser('rebuildRocketYoutubePreviews', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildRocketYoutubePreviews(baseContext)])
  }

  it('should rebuild an iframe from a preview div', async () => {
    const value = html`
      <div
        class="rll-youtube-player"
        data-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-id="dQw4w9WgXcQ"
        data-alt="Title"
      ></div>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('rll-youtube-player')
  })

  it('should carry the data-query through as a query string', async () => {
    const value = html`
      <div
        class="rll-youtube-player"
        data-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-query="feature=oembed"
      ></div>
    `
    const result = await transform(value)

    expect(result).toContain(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed">',
    )
  })

  it('should leave the element untouched when there is no data-src', async () => {
    const value = html`<div class="rll-youtube-player" data-id="dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('rll-youtube-player')
    expect(result).not.toContain('<iframe')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div
        class="rll-youtube-player"
        data-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-id="dQw4w9WgXcQ"
        data-query="feature=oembed"
        data-alt="Title"
      >
        <img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" />
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
    expect(result).not.toContain('rll-youtube-player')
  })
})
