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
    const value = html`<div class="lazyYT" data-youtube-id="a_b-c123def"></div>`
    const result = await transform(value)

    expect(result).toContain('https://www.youtube.com/embed/a_b-c123def')
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

  // Measured across the corpus: `.youtube-embed[data-video_id]` is the largest facade at 701
  // feeds, ahead of the `.lazyYT` plugin this transform started with.
  it('should rebuild the youtube-embed facade', async () => {
    const value = html`<div class="youtube-embed" data-video_id="dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('youtube-embed')
  })

  it('should rebuild a data-youtube-id facade whatever class it carries', async () => {
    const value = html`<div class="video-wrap" data-youtube-id="dQw4w9WgXcQ"></div>`

    expect(await transform(value)).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should rebuild a data-youtube facade', async () => {
    const value = html`<div data-youtube="dQw4w9WgXcQ"></div>`

    expect(await transform(value)).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should rebuild a youtube-player facade naming its id', async () => {
    const value = html`<div class="youtube-player" data-id="dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('youtube-player')
  })

  it('should rebuild a youtube-player facade naming its embed', async () => {
    const value = html`<div class="youtube-player" data-embed="dQw4w9WgXcQ"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('youtube-player')
  })

  // `data-id` says nothing about a platform, so the class is what has to name one.
  it('should leave a data-id div that does not name youtube', async () => {
    const value = html`<div class="wp-block-gallery" data-id="dQw4w9WgXcQ"></div>`

    expect(await transform(value)).toContain('wp-block-gallery')
  })

  // The facade div holds nothing, so an unrecognised one is not an empty box on the page:
  // stripEmptyTags removes it downstream and the video leaves the item altogether.
  it('should keep a youtube-player facade through the default pipeline', async () => {
    const value = html`
      <p>Before</p>
      <div class="youtube-player" data-id="dQw4w9WgXcQ"></div>
      <p>After</p>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
  })

  // `data-video_id` is not exclusive to YouTube, so the class has to name the platform.
  it('should leave a data-video_id div that does not name youtube', async () => {
    const value = html`<div class="adthrive-video-player" data-video_id="dQw4w9WgXcQ"></div>`

    expect(await transform(value)).toContain('adthrive-video-player')
  })

  // The id goes straight into a url, so what counts as one stays embeds/youtube.ts's answer.
  it('should leave a facade whose id is not a youtube id', async () => {
    const value = html`<div class="youtube-embed" data-video_id="../../etc"></div>`

    expect(await transform(value)).toContain('youtube-embed')
  })

  it('should be idempotent', async () => {
    const value = html`<div class="lazyYT" data-youtube-id="dQw4w9WgXcQ"></div>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
