import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertDatawrapperEmbeds } from './convertDatawrapperEmbeds.js'

describeForEachParser('convertDatawrapperEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertDatawrapperEmbeds(baseContext)])
  }

  it('should convert a responsive iframe into a linked static image', async () => {
    const value = html`<iframe id="datawrapper-chart-bdqZJ" src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>`
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/bdqZJ/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/bdqZJ/full.png"')
    expect(result).toContain('alt="Egg prices"')
    expect(result).not.toContain('<iframe')
  })

  it('should convert an iframe with no title (no alt attribute)', async () => {
    const value = html`<iframe src="https://datawrapper.dwcdn.net/t4fiQ/3/"></iframe>`
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/t4fiQ/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/t4fiQ/full.png"')
    expect(result).not.toContain('alt=')
  })

  it('should accept a version-less iframe url', async () => {
    const value = html`<iframe src="https://datawrapper.dwcdn.net/M9ROR/"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/M9ROR/full.png"')
  })

  it('should remove the sibling resize listener script', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>
      <script type="text/javascript">window.addEventListener("message",function(a){if(void 0!==a.data["datawrapper-height"]){}})</script>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/bdqZJ/full.png"')
    expect(result).not.toContain('datawrapper-height')
    expect(result).not.toContain('<script')
  })

  it('should remove the legacy embedDeltas resize script', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/b0fHe/1/"></iframe>
      <script type="text/javascript">window.datawrapper=window.datawrapper||{};window.datawrapper["b0fHe"]={};window.datawrapper["b0fHe"].embedDeltas={"100":787};</script>
    `
    const result = await transform(value)

    expect(result).not.toContain('embedDeltas')
    expect(result).not.toContain('<script')
  })

  it('should leave the secret preview iframe for the generic placeholder', async () => {
    const value = html`<iframe src="https://datawrapper.dwcdn.net/AbCdE/2/#?secret=tok3n"></iframe>`
    const result = await transform(value)

    expect(result).toContain('<iframe')
    expect(result).toContain('secret=tok3n')
    expect(result).not.toContain('full.png')
  })

  it('should recover the script/noscript form and carry the alt', async () => {
    const value = html`
      <div id="datawrapper-vis-CmrER" style="min-height:441px">
        <script type="text/javascript" defer src="https://datawrapper.dwcdn.net/CmrER/embed.js" data-target="#datawrapper-vis-CmrER"></script>
        <noscript><img src="https://datawrapper.dwcdn.net/CmrER/full.png" alt="Line chart of egg prices"></noscript>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/CmrER/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/CmrER/full.png"')
    expect(result).toContain('alt="Line chart of egg prices"')
    expect(result).not.toContain('embed.js')
    expect(result).not.toContain('datawrapper-vis-')
  })

  it('should recover the script form even when the noscript fallback is absent', async () => {
    const value = html`
      <div id="datawrapper-vis-CmrER" style="min-height:441px">
        <script type="text/javascript" defer src="https://datawrapper.dwcdn.net/CmrER/embed.js" data-target="#datawrapper-vis-CmrER"></script>
      </div>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/CmrER/full.png"')
    expect(result).not.toContain('embed.js')
  })

  it('should convert the Texas Tribune data-frame-src wrapper', async () => {
    const value = html`<div data-frame-sandbox="allow-scripts" data-frame-src="https://datawrapper.dwcdn.net/OaEnQ/"></div>`
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/OaEnQ/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/OaEnQ/full.png"')
    expect(result).not.toContain('data-frame-src')
  })

  it('should convert the plain-link form', async () => {
    const value = html`<div class="datawrapper-embed"><a href="https://datawrapper.dwcdn.net/8sk4Y/3/" target="_blank" rel="noopener noreferrer">View Link</a></div>`
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/8sk4Y/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/8sk4Y/full.png"')
    expect(result).not.toContain('View Link')
  })

  it('should leave a standalone static image untouched', async () => {
    const value = html`<img decoding="async" src="https://datawrapper.dwcdn.net/AbCdE/full.png" width="600">`
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/AbCdE/full.png"')
    expect(result).not.toContain('<a ')
  })

  it('should leave a non-datawrapper iframe untouched', async () => {
    const value = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`
    const result = await transform(value)

    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
    expect(result).not.toContain('dwcdn.net')
  })

  it('should convert every iframe when a post packs several', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/AAAAA/1/"></iframe>
      <iframe src="https://datawrapper.dwcdn.net/BBBBB/1/"></iframe>
    `
    const result = await transform(value)

    expect(result).toContain('AAAAA/full.png')
    expect(result).toContain('BBBBB/full.png')
    expect(result).not.toContain('<iframe')
  })

  it('should be idempotent', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>
      <script>window.addEventListener("message",function(a){a.data["datawrapper-height"]})</script>
    `
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [convertDatawrapperEmbeds(baseContext)])

    expect(twice).toBe(once)
  })

  it('should survive into the output end to end', async () => {
    const value = html`<iframe src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('https://datawrapper.dwcdn.net/bdqZJ/full.png')
  })
})
