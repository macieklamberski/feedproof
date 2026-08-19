import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertDatawrapperEmbeds } from './convertDatawrapperEmbeds.js'

// The two parsers order the img attributes differently, so a case whose image carries an alt
// beside its src compares through toEqualHtml. The rest compare byte for byte.
describeForEachParser('convertDatawrapperEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertDatawrapperEmbeds(baseContext)])
  }

  it('should convert a responsive iframe into a linked static image', async () => {
    const value = html`
      <iframe
        id="datawrapper-chart-bdqZJ"
        src="https://datawrapper.dwcdn.net/bdqZJ/2/"
        title="Egg prices"
      ></iframe>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/bdqZJ/">
        <img src="https://datawrapper.dwcdn.net/bdqZJ/full.png" alt="Egg prices">
      </a>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should convert an iframe with no title (no alt attribute)', async () => {
    const value = '<iframe src="https://datawrapper.dwcdn.net/t4fiQ/3/"></iframe>'
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/t4fiQ/">
        <img src="https://datawrapper.dwcdn.net/t4fiQ/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should accept a version-less iframe url', async () => {
    const value = '<iframe src="https://datawrapper.dwcdn.net/M9ROR/"></iframe>'
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/M9ROR/">
        <img src="https://datawrapper.dwcdn.net/M9ROR/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should remove the sibling resize listener script', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>
      <script type="text/javascript">window.addEventListener("message",function(a){if(void 0!==a.data["datawrapper-height"]){}})</script>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/bdqZJ/">
        <img src="https://datawrapper.dwcdn.net/bdqZJ/full.png" alt="Egg prices">
      </a>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should remove the legacy embedDeltas resize script', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/b0fHe/1/"></iframe>
      <script type="text/javascript">window.datawrapper=window.datawrapper||{};window.datawrapper["b0fHe"]={};window.datawrapper["b0fHe"].embedDeltas={"100":787};</script>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/b0fHe/">
        <img src="https://datawrapper.dwcdn.net/b0fHe/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave the secret preview iframe for the generic placeholder', async () => {
    const value = '<iframe src="https://datawrapper.dwcdn.net/AbCdE/2/#?secret=tok3n"></iframe>'

    expect(await transform(value)).toBe(value)
  })

  it('should recover the script/noscript form and carry the alt', async () => {
    const value = html`
      <div id="datawrapper-vis-CmrER" style="min-height:441px">
        <script type="text/javascript" defer src="https://datawrapper.dwcdn.net/CmrER/embed.js" data-target="#datawrapper-vis-CmrER"></script>
        <noscript><img src="https://datawrapper.dwcdn.net/CmrER/full.png" alt="Line chart of egg prices"></noscript>
      </div>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/CmrER/">
        <img src="https://datawrapper.dwcdn.net/CmrER/full.png" alt="Line chart of egg prices">
      </a>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should recover the script form even when the noscript fallback is absent', async () => {
    const value = html`
      <div id="datawrapper-vis-CmrER" style="min-height:441px">
        <script type="text/javascript" defer src="https://datawrapper.dwcdn.net/CmrER/embed.js" data-target="#datawrapper-vis-CmrER"></script>
      </div>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/CmrER/">
        <img src="https://datawrapper.dwcdn.net/CmrER/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  // data-frame-src is now materialized into an <iframe> by rebuildDeferredIframes upstream, so
  // a Texas Tribune / @newswire/frames Datawrapper wrapper still becomes an image, end to end.
  it('should convert a data-frame-src datawrapper wrapper end to end', async () => {
    const value = html`
      <div
        data-frame-sandbox="allow-scripts"
        data-frame-src="https://datawrapper.dwcdn.net/OaEnQ/"
      ></div>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/OaEnQ/">
        <img src="https://datawrapper.dwcdn.net/OaEnQ/full.png">
      </a>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toBe(expected)
  })

  it('should convert the plain-link form', async () => {
    const value = html`
      <div class="datawrapper-embed">
        <a href="https://datawrapper.dwcdn.net/8sk4Y/3/" target="_blank" rel="noopener noreferrer">View Link</a>
      </div>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/8sk4Y/">
        <img src="https://datawrapper.dwcdn.net/8sk4Y/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave a standalone static image untouched', async () => {
    const value = html`
      <img
        decoding="async"
        src="https://datawrapper.dwcdn.net/AbCdE/full.png"
        width="600"
      >
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a non-datawrapper iframe untouched', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toBe(value)
  })

  it('should convert every iframe when a post packs several', async () => {
    const value = html`
      <iframe src="https://datawrapper.dwcdn.net/AAAAA/1/"></iframe>
      <iframe src="https://datawrapper.dwcdn.net/BBBBB/1/"></iframe>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/AAAAA/">
        <img src="https://datawrapper.dwcdn.net/AAAAA/full.png">
      </a>
      <a href="https://datawrapper.dwcdn.net/BBBBB/">
        <img src="https://datawrapper.dwcdn.net/BBBBB/full.png">
      </a>
    `

    expect(await transform(value)).toBe(expected)
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
    const value = html`
      <iframe
        src="https://datawrapper.dwcdn.net/bdqZJ/2/"
        title="Egg
        prices"
      ></iframe>
    `
    const expected = html`
      <a href="https://datawrapper.dwcdn.net/bdqZJ/">
        <img src="https://datawrapper.dwcdn.net/bdqZJ/full.png" alt="Egg prices">
      </a>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })
})
