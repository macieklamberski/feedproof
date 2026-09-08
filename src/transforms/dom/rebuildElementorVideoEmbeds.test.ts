import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildElementorVideoEmbeds } from './rebuildElementorVideoEmbeds.js'

describeForEachParser('rebuildElementorVideoEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildElementorVideoEmbeds(baseContext)])
  }

  it('should rebuild a youtube iframe from the widget settings', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","video_type":"youtube"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video">
        <div class="elementor-widget-container">
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // `data-settings` is a JSON payload, so resolveRelativeUrls never reaches inside it and a url
  // the publisher wrote protocol-relative arrives naming no host of its own. With no base to
  // parse it against there is no id, and the empty player div goes with the rest of the widget.
  it('should rebuild a youtube iframe from a protocol-relative settings url', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"youtube_url":"//www.youtube.com/watch?v=dQw4w9WgXcQ","video_type":"youtube"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video">
        <div class="elementor-widget-container">
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a vimeo iframe from the widget settings', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"vimeo_url":"https://vimeo.com/76979871","video_type":"vimeo"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video">
        <div class="elementor-widget-container">
          <iframe src="https://player.vimeo.com/video/76979871"></iframe>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild a dailymotion iframe from the widget settings', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"dailymotion_url":"https://www.dailymotion.com/video/x7tgad0","video_type":"dailymotion"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video">
        <div class="elementor-widget-container">
          <iframe src="https://www.dailymotion.com/embed/video/x7tgad0"></iframe>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The widget stores the share link, and the platform's reader rebuilds it onto the player
  // route the other three branches also mint.
  it('should rebuild a videopress iframe from the widget settings', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"videopress_url":"https://videopress.com/v/kUJmAcSf","video_type":"videopress"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video">
        <div class="elementor-widget-container">
          <iframe src="https://videopress.com/embed/kUJmAcSf"></iframe>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The settings payload is not markup, so nothing has checked what the url names before it
  // reaches a src. The three id readers find an id in a foreign path as readily as in the
  // platform's own, and the player is then minted around it.
  it('should leave a youtube widget naming a foreign host alone', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"youtube_url":"https://evil.test/embed/dQw4w9WgXcQ","video_type":"youtube"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a vimeo widget naming a foreign host alone', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"vimeo_url":"https://evil.test/76979871","video_type":"vimeo"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a dailymotion widget naming a foreign host alone', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"dailymotion_url":"https://evil.test/video/x7tgad0","video_type":"dailymotion"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a videopress widget naming a foreign host alone', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"videopress_url":"https://evil.test/anything","video_type":"videopress"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a widget with malformed data-settings alone', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings='{not valid json'>
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div class="elementor-widget elementor-widget-video" data-settings="{not valid json">
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a widget with empty data-settings alone', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings="">
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip a widget whose video type is unknown', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings='{"video_type":"facebook"}'>
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings="{&quot;video_type&quot;:&quot;facebook&quot;}"
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // The video type comes out of the widget's own JSON, so `constructor` names a member every
  // object inherits and the source table has to refuse it the way it refuses `facebook`.
  it('should skip a widget whose video type names an inherited member', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"video_type":"constructor"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings="{&quot;video_type&quot;:&quot;constructor&quot;}"
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <div
        class="elementor-widget elementor-widget-video"
        data-settings='{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","video_type":"youtube"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const expected = html`
      <div
        data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        data-embed-provider="youtube"
        data-embed-id="dQw4w9WgXcQ"
        data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
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
        class="elementor-widget elementor-widget-video"
        data-settings='{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","video_type":"youtube"}'
      >
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
