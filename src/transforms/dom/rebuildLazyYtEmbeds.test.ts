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
    const value = html`
      <div
        class="lazyYT"
        data-youtube-id="dQw4w9WgXcQ"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep an underscore-bearing video id intact', async () => {
    const value = html`
      <div
        class="lazyYT"
        data-youtube-id="a_b-c123def"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/a_b-c123def"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a facade with an empty data-youtube-id untouched', async () => {
    const value = html`
      <div
        class="lazyYT"
        data-youtube-id=""
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a facade with no data-youtube-id untouched', async () => {
    const value = '<div class="lazyYT"></div>'

    expect(await transform(value)).toEqualHtml(value)
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
    const expected = html`
      <div
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
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

  // Measured across the corpus: `.youtube-embed[data-video_id]` is the largest facade at 701
  // feeds, ahead of the `.lazyYT` plugin at 155.
  it('should rebuild the youtube-embed facade', async () => {
    const value = html`
      <div
        class="youtube-embed"
        data-video_id="dQw4w9WgXcQ"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a data-youtube-id facade whatever class it carries', async () => {
    const value = html`
      <div
        class="video-wrap"
        data-youtube-id="dQw4w9WgXcQ"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a data-youtube facade', async () => {
    const value = '<div data-youtube="dQw4w9WgXcQ"></div>'
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a youtube-player facade naming its id', async () => {
    const value = html`
      <div
        class="youtube-player"
        data-id="dQw4w9WgXcQ"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a youtube-player facade naming its embed', async () => {
    const value = html`
      <div
        class="youtube-player"
        data-embed="dQw4w9WgXcQ"
      ></div>
    `
    const expected = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  // `data-id` says nothing about a platform, so the class is what has to name one.
  it('should leave a data-id div that does not name youtube', async () => {
    const value = html`
      <div
        class="wp-block-gallery"
        data-id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  // The facade div holds nothing, so an unrecognised one is not an empty box on the page:
  // stripEmptyTags removes it downstream and the video leaves the item altogether.
  it('should keep a youtube-player facade through the default pipeline', async () => {
    const value = html`
      <p>Before</p>
      <div class="youtube-player" data-id="dQw4w9WgXcQ"></div>
      <p>After</p>
    `
    const expected = html`
      <p>Before</p>
      <div
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        data-embed-ratio="16/9"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      >
      </div>
      <p>After</p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // `data-video_id` is not exclusive to YouTube, so the class has to name the platform.
  it('should leave a data-video_id div that does not name youtube', async () => {
    const value = html`
      <div
        class="adthrive-video-player"
        data-video_id="dQw4w9WgXcQ"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  // The id goes straight into a url, so what counts as one stays embeds/youtube.ts's answer.
  it('should leave a facade whose id is not a youtube id', async () => {
    const value = html`
      <div
        class="youtube-embed"
        data-video_id="../../etc"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <div
        class="lazyYT"
        data-youtube-id="dQw4w9WgXcQ"
      ></div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
