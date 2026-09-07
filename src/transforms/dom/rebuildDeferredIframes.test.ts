import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildDeferredIframes } from './rebuildDeferredIframes.js'

describeForEachParser('rebuildDeferredIframes', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildDeferredIframes(baseContext)])
  }

  it('should rebuild an iframe from a Pym.js data-pym-src div', async () => {
    const value = html`
      <div
        id="chart"
        data-pym-src="https://apps.npr.org/chart/"
      >Loading…</div>
    `
    const expected = '<iframe src="https://apps.npr.org/chart/"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should rebuild an iframe from a @newswire/frames data-frame-src div', async () => {
    const value = '<div data-frame-src="https://embed.example.org/graphic/"></div>'
    const expected = '<iframe src="https://embed.example.org/graphic/"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should skip an already-initialized Pym node', async () => {
    const value = html`
      <div
        data-pym-src="https://apps.npr.org/chart/"
        data-pym-auto-initialized="true"
      ></div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a div whose attribute is not a URL untouched', async () => {
    const value = '<div data-frame-src="not a url"></div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an unrelated div untouched', async () => {
    const value = '<div class="content">Hello</div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<div data-frame-src="https://embed.example.org/graphic/"></div>'
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [rebuildDeferredIframes(baseContext)])

    expect(twice).toEqualHtml(once)
  })

  it('should surface a deferred embed into a placeholder end to end', async () => {
    const value = '<div data-frame-src="https://embed.example.org/graphic/"></div>'
    const expected = '<div data-embed-src="https://embed.example.org/graphic/"></div>'
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  // The Drupal/CKEditor convention. Its value is a watch page rather than a player url, which
  // the resolvers turn into a player downstream.
  it('should rebuild an iframe from data-oembed-url', async () => {
    const value = '<div data-oembed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></div>'
    const expected = '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  // ARVE's lazyload play button. Its widget holds no image, so without this the reader is left
  // with an empty box: 155 of the 276 corpus feeds carrying it have no YouTube player anywhere.
  it('should rebuild an iframe from an ARVE play button', async () => {
    const value = html`
      <button
        class="arve-play-btn arve-play-btn--youtube"
        data-iframe="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
      ></button>
    `
    const expected =
      '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  // `data-iframe` is a name anyone could pick, so the class is what says this is ARVE.
  it('should leave a data-iframe attribute that ARVE did not write', async () => {
    const value = '<div data-iframe="https://example.com/player"></div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  // 566 of the 624 corpus wrappers already hold the iframe, and this transform replaces what it
  // matches, so acting on those would discard a working player and the size it states.
  it('should leave a data-oembed-url wrapper that already holds a player', async () => {
    const value = html`
      <div data-oembed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360"></iframe>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })
})
