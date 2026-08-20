import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { surfaceTemplateEmbeds } from './surfaceTemplateEmbeds.js'

describeForEachParser('surfaceTemplateEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceTemplateEmbeds(baseContext)])
  }

  it('should surface an iframe trapped in a template', async () => {
    const value = html`
      <p>thumb</p>
      <template>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">
        </iframe>
      </template>
    `
    const expected = html`
      <p>thumb</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should surface a data-embed-src placeholder trapped in a template', async () => {
    const value = html`
      <template>
        <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ">
        </div>
      </template>
    `
    const expected = '<div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a template with no embed alone', async () => {
    const value = '<template><p>placeholder text</p></template>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should hoist the content in place of the template', async () => {
    const value = html`
      <p>before</p>
      <template>
        <iframe src="https://www.youtube.com/embed/x">
        </iframe>
      </template>
      <p>after</p>
    `
    const expected = html`
      <p>before</p>
      <iframe src="https://www.youtube.com/embed/x"></iframe>
      <p>after</p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should collapse the hd-bcve shape into one connected player', async () => {
    const value = html`
      <figure
        class="hd-bcve-wrapper is--youtube"
        data-id="yEB6Q3wTKcw"
      ><img class="hd-bcve-thumbnail" src="https://img.youtube.com/vi/yEB6Q3wTKcw/maxresdefault.jpg">
      </figure>
      <template id="hd-bcve-embed-html-yEB6Q3wTKcw">
        <figure class="wp-block-embed">
          <div class="wp-block-embed__wrapper">
            <iframe src="https://www.youtube.com/embed/yEB6Q3wTKcw?feature=oembed"></iframe>
          </div>
        </figure>
      </template>
    `
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/yEB6Q3wTKcw"
        data-embed-provider="youtube"
        data-embed-id="yEB6Q3wTKcw"
        data-embed-url="https://www.youtube.com/watch?v=yEB6Q3wTKcw"
        data-embed-thumbnail="https://img.youtube.com/vi/yEB6Q3wTKcw/maxresdefault.jpg"
        data-embed-thumbnail-fallback="https://i.ytimg.com/vi/yEB6Q3wTKcw/hqdefault.jpg"
        data-embed-ratio="16/9"
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://moby.com',
      heuristics: true,
    })

    expect(result).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>thumb</p>
      <template>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">
        </iframe>
      </template>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})

describeForEachParser('surfaceTemplateEmbeds (media)', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [surfaceTemplateEmbeds(baseContext)])
  }

  // Shopify's default theme ships correct markup parked inside an inert <template>.
  it('should surface a video parked in a template', async () => {
    const value = html`
      <deferred-media data-media-id="1">
        <template>
          <video controls>
            <source src="https://cdn.example.com/clip.mp4" type="video/mp4">
          </video>
        </template>
      </deferred-media>
    `
    const expected = html`
      <deferred-media data-media-id="1">
        <video controls>
          <source src="https://cdn.example.com/clip.mp4" type="video/mp4">
        </video>
      </deferred-media>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should surface an audio parked in a template', async () => {
    const value = html`
      <div>
        <template>
          <audio controls src="https://cdn.example.com/ep.mp3"></audio>
        </template>
      </div>
    `
    const expected = '<div><audio controls src="https://cdn.example.com/ep.mp3"></audio></div>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a template holding no media or embed alone', async () => {
    const value = '<div><template><span class="skeleton"></span></template></div>'

    expect(await transform(value)).toEqualHtml(value)
  })
})
