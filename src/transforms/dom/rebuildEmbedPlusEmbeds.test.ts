import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildEmbedPlusEmbeds } from './rebuildEmbedPlusEmbeds.js'

describeForEachParser('rebuildEmbedPlusEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildEmbedPlusEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a facade div', async () => {
    const value = html`
      <div
        class="__youtube_prefs__ epyt-facade no-lazyload"
        data-facadesrc="https://www.youtube.com/embed/dQw4w9WgXcQ"
      >
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" />
        <button class="epyt-facade-play"></button>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain(
      'data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"',
    )
    expect(result).not.toContain('epyt-facade')
  })

  it('should leave the element untouched when there is no data-facadesrc', async () => {
    const value = html`
      <div class="epyt-facade no-lazyload">
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" />
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('epyt-facade')
    expect(result).not.toContain('<iframe')
  })

  it('should leave the element untouched when data-facadesrc is empty', async () => {
    const value = html`<div class="epyt-facade no-lazyload" data-facadesrc=""></div>`
    const result = await transform(value)

    expect(result).toContain('epyt-facade')
    expect(result).not.toContain('<iframe')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div class="epyt-video-wrapper">
        <div
          class="__youtube_prefs__ epyt-facade no-lazyload"
          data-facadesrc="https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=1&"
        >
          <img
            class="epyt-facade-poster"
            src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          />
          <button class="epyt-facade-play"></button>
        </div>
      </div>
    `
    // The facade's maxres poster wins over the resolver's hqdefault default.
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      ></div>
    `

    expect(
      await transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com' }),
    ).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <div
        class="__youtube_prefs__ epyt-facade no-lazyload"
        data-facadesrc="https://www.youtube.com/embed/dQw4w9WgXcQ"
      >
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" />
        <button class="epyt-facade-play"></button>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
