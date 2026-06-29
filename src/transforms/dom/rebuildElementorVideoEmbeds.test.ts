import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
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
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')
    expect(result).not.toContain('class="elementor-video"')
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
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://player.vimeo.com/video/76979871">')
    expect(result).not.toContain('class="elementor-video"')
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
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://www.dailymotion.com/embed/video/x7tgad0">')
    expect(result).not.toContain('class="elementor-video"')
  })

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
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://videopress.com/v/kUJmAcSf">')
    expect(result).not.toContain('class="elementor-video"')
  })

  it('should leave a widget with malformed data-settings alone', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings='{not valid json'>
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('class="elementor-video"')
    expect(result).not.toContain('<iframe')
  })

  it('should leave a widget with empty data-settings alone', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings="">
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('class="elementor-video"')
    expect(result).not.toContain('<iframe')
  })

  it('should skip a widget whose video type is unknown', async () => {
    const value = html`
      <div class="elementor-widget elementor-widget-video" data-settings='{"video_type":"facebook"}'>
        <div class="elementor-widget-container">
          <div class="elementor-video"></div>
        </div>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('class="elementor-video"')
    expect(result).not.toContain('<iframe')
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
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
  })
})
