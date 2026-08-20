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
    const expected = html`
      <iframe
        data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave the element untouched when there is no data-facadesrc', async () => {
    const value = html`
      <div class="epyt-facade no-lazyload">
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" />
      </div>
    `
    const expected = html`
      <div class="epyt-facade no-lazyload">
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave the element untouched when data-facadesrc is empty', async () => {
    const value = html`
      <div
        class="epyt-facade
        no-lazyload"
        data-facadesrc=""
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
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
        class="__youtube_prefs__ epyt-facade no-lazyload"
        data-facadesrc="https://www.youtube.com/embed/dQw4w9WgXcQ"
      >
        <img class="epyt-facade-poster" src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" />
        <button class="epyt-facade-play"></button>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
