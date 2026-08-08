import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildWistiaEmbeds } from './rebuildWistiaEmbeds.js'

describeForEachParser('rebuildWistiaEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildWistiaEmbeds(baseContext)])
  }

  it('should rebuild an iframe from a wistia_async facade div', async () => {
    const value = html`
      <div class="wistia_responsive_padding">
        <div class="wistia_responsive_wrapper">
          <div class="wistia_embed wistia_async_zyl6xrmj10 popover=true"></div>
        </div>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10">')
    expect(result).not.toContain('wistia_async_')
    expect(result).not.toContain('wistia_responsive_padding')
  })

  it('should rebuild an iframe from a standalone embed div with no wrapper', async () => {
    const value = html`<div class="wistia_embed wistia_async_zyl6xrmj10"></div>`
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10">')
  })

  it('should leave an element without a recoverable id untouched', async () => {
    const value = html`<div class="wistia_embed wistia_async_"></div>`
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
    expect(result).toContain('wistia_async_')
  })

  it('should survive into the output end to end', async () => {
    const value = html`
      <div class="wistia_responsive_padding">
        <div class="wistia_embed wistia_async_zyl6xrmj10"></div>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('https://fast.wistia.net/embed/iframe/zyl6xrmj10')
  })

  it('should be idempotent', async () => {
    const value = html`
      <div class="wistia_responsive_padding">
        <div class="wistia_responsive_wrapper">
          <div class="wistia_embed wistia_async_zyl6xrmj10 popover=true"></div>
        </div>
      </div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
