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
    const value = '<div class="wistia_embed wistia_async_zyl6xrmj10"></div>'
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10">')
  })

  it('should leave an element without a recoverable id untouched', async () => {
    const value = '<div class="wistia_embed wistia_async_"></div>'
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

  it('should rebuild an iframe from the wistia-player custom element', async () => {
    const value = html`
      <wistia-player
        media-id="zyl6xrmj10"
        aspect="1.7777777777777777"
      ></wistia-player>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://fast.wistia.net/embed/iframe/zyl6xrmj10"')
    expect(result).toContain('width="100"')
    expect(result).toContain('height="56"')
    expect(result).not.toContain('<wistia-player')
  })

  it('should rebuild the custom element without an aspect, stating no size', async () => {
    const value = '<wistia-player media-id="zyl6xrmj10"></wistia-player>'
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10">')
    expect(result).not.toContain('width=')
  })

  it('should rebuild an iframe from a lone loader script', async () => {
    const value = '<script src="https://fast.wistia.com/embed/medias/zyl6xrmj10.jsonp"></script>'
    const result = await transform(value)

    expect(result).toContain('<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10">')
  })

  // The common shape: loader plus facade div. The div is the better carrier, so the script
  // must not mint a second player beside it.
  it('should not duplicate the player when the script sits beside its facade div', async () => {
    const value = html`
      <script src="https://fast.wistia.com/embed/medias/zyl6xrmj10.jsonp"></script>
      <div class="wistia_embed wistia_async_zyl6xrmj10"></div>
    `
    const result = await transform(value)

    expect(result.match(/<iframe/g)).toHaveLength(1)
  })

  it('should not duplicate the player when a real iframe already names the media', async () => {
    const value = html`
      <script src="https://fast.wistia.com/embed/medias/zyl6xrmj10.jsonp"></script>
      <iframe src="https://fast.wistia.net/embed/medias/zyl6xrmj10"></iframe>
    `
    const result = await transform(value)

    expect(result.match(/<iframe/g)).toHaveLength(1)
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
