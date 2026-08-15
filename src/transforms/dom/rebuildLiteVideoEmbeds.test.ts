import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildLiteVideoEmbeds } from './rebuildLiteVideoEmbeds.js'

describeForEachParser('rebuildLiteVideoEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLiteVideoEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a lite-youtube element', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>`
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should rebuild an iframe from a lite-vimeo element', async () => {
    const value = html`<lite-vimeo videoid="76979871"></lite-vimeo>`
    const expected = html`<iframe src="https://player.vimeo.com/video/76979871"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should leave a lite-youtube element with no videoid alone', async () => {
    const value = html`<lite-youtube></lite-youtube>`

    expect(await transform(value)).toBe(value)
  })

  it('should carry a youtube start offset into a query param', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" start="90"></lite-youtube>`
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=90"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should carry a vimeo start offset into a time fragment', async () => {
    const value = html`<lite-vimeo videoid="76979871" start="90"></lite-vimeo>`
    const expected = html`<iframe src="https://player.vimeo.com/video/76979871#t=90s"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should ignore a non-numeric start', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" start="10&autoplay=1"></lite-youtube>`
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should carry the whitelisted half of params', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" params="start=10"></lite-youtube>`
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=10"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  // The attribute names the same option more specifically than the query string does.
  it('should let a start attribute win over the one inside params', async () => {
    const value = html`
      <lite-youtube videoid="dQw4w9WgXcQ" start="90" params="start=10"></lite-youtube>
    `
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=90"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  // Anything the iframe path would not carry cannot arrive this way either.
  it('should drop a param outside the whitelist', async () => {
    const value = html`
      <lite-youtube videoid="dQw4w9WgXcQ" params="start=10&autoplay=1"></lite-youtube>
    `
    const expected = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=10"></iframe>`

    expect(await transform(value)).toBe(expected)
  })

  it('should keep a params offset through the default pipeline', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ" params="start=10"></lite-youtube>`
    const expected = html`
      <div
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=10"
      >
      </div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  it('should carry videotitle into the iframe title', async () => {
    const value = html`
      <lite-youtube
        videoid="dQw4w9WgXcQ"
        videotitle="Never Gonna Give You Up"
      ></lite-youtube>
    `
    const expected = html`
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        title="Never Gonna Give You Up"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>`
    const expected = html`
      <div
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      >
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
