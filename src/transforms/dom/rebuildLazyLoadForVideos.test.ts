import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildLazyLoadForVideos } from './rebuildLazyLoadForVideos.js'

describeForEachParser('rebuildLazyLoadForVideos', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildLazyLoadForVideos(baseContext)])
  }

  it('should rebuild an iframe from a youtube facade', async () => {
    const value = html`
      <div class="container-lazyload preview-lazyload container-youtube">
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          class="lazy-load-youtube preview-lazyload preview-youtube"
        >
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </a>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('preview-lazyload')
  })

  it('should rebuild an iframe from a vimeo facade', async () => {
    const value = html`
      <div class="container-lazyload preview-lazyload container-vimeo">
        <a
          href="https://vimeo.com/76979871"
          class="lazy-load-vimeo preview-lazyload preview-vimeo"
        >
          https://vimeo.com/76979871
        </a>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://player.vimeo.com/video/76979871">')
    expect(result).not.toContain('preview-lazyload')
  })

  it('should preserve a vimeo unlisted hash', async () => {
    const value = html`
      <a
        href="https://vimeo.com/76979871?h=abc123def4"
        class="preview-lazyload preview-vimeo"
      ></a>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://player.vimeo.com/video/76979871?h=abc123def4">')
  })

  it('should prefer data-video-uri over href', async () => {
    const value = html`
      <a
        href="https://www.youtube.com/watch?v=ignored0000"
        class="preview-lazyload preview-youtube"
        data-video-uri="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      ></a>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
  })

  it('should carry data-video-title into the iframe title', async () => {
    const value = html`
      <a
        href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        class="preview-lazyload preview-youtube"
        data-video-title="Never Gonna Give You Up"
      ></a>
    `
    const result = await transform(value)

    expect(result).toContain('title="Never Gonna Give You Up"')
  })

  it('should leave the facade untouched when no id is recoverable', async () => {
    const value = html`
      <a
        href="https://example.com/not-a-video"
        class="preview-lazyload preview-youtube"
      ></a>
    `
    const result = await transform(value)

    expect(result).toContain('preview-lazyload')
    expect(result).not.toContain('<iframe')
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div class="container-lazyload preview-lazyload container-youtube">
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          class="lazy-load-youtube preview-lazyload preview-youtube"
        >
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </a>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
    expect(result).not.toContain('preview-lazyload')
  })

  it('should be idempotent', async () => {
    const value = html`
      <div class="container-lazyload preview-lazyload container-youtube">
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          class="lazy-load-youtube preview-lazyload preview-youtube"
        >
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </a>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
