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
    const value = html`<div id="chart" data-pym-src="https://apps.npr.org/chart/">Loading…</div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://apps.npr.org/chart/">')
    expect(result).not.toContain('data-pym-src')
  })

  it('should rebuild an iframe from a @newswire/frames data-frame-src div', async () => {
    const value = html`<div data-frame-src="https://embed.example.org/graphic/"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://embed.example.org/graphic/">')
    expect(result).not.toContain('data-frame-src')
  })

  it('should skip an already-initialized Pym node', async () => {
    const value = html`
      <div
        data-pym-src="https://apps.npr.org/chart/"
        data-pym-auto-initialized="true"
      ></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('data-pym-src')
  })

  it('should leave a div whose attribute is not a URL untouched', async () => {
    const value = html`<div data-frame-src="not a url"></div>`
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
  })

  it('should leave an unrelated div untouched', async () => {
    const value = html`<div class="content">Hello</div>`
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('Hello')
  })

  it('should be idempotent', async () => {
    const value = html`<div data-frame-src="https://embed.example.org/graphic/"></div>`
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [rebuildDeferredIframes(baseContext)])

    expect(twice).toBe(once)
  })

  it('should surface a deferred embed into a placeholder end to end', async () => {
    const value = html`<div data-frame-src="https://embed.example.org/graphic/"></div>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('embed.example.org/graphic/')
  })
  // The Drupal/CKEditor convention. Its value is a watch page rather than a player url, which
  // the resolvers turn into a player downstream.
  it('should rebuild an iframe from data-oembed-url', async () => {
    const value = html`<div data-oembed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></div>`

    expect(await transform(value)).toContain(
      '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ">',
    )
  })

  // 566 of the 624 corpus wrappers already hold the iframe, and this transform replaces what it
  // matches, so acting on those would discard a working player and the size it states.
  it('should leave a data-oembed-url wrapper that already holds a player', async () => {
    const value = html`
      <div data-oembed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360"></iframe>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })
})
