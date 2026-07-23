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

  it('should recover the script/noscript form from its PNG fallback and carry the alt', async () => {
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

  it('should convert the plain-link form', async () => {
    const value = html`<div class="datawrapper-embed"><a href="https://datawrapper.dwcdn.net/8sk4Y/3/" target="_blank" rel="noopener noreferrer">View Link</a></div>`
    const result = await transform(value)

    expect(result).toContain('<a href="https://datawrapper.dwcdn.net/8sk4Y/">')
    expect(result).toContain('src="https://datawrapper.dwcdn.net/8sk4Y/full.png"')
    expect(result).not.toContain('View Link')
  })

  it('should leave a non-datawrapper iframe untouched', async () => {
    const value = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`
    const result = await transform(value)

    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
    expect(result).not.toContain('dwcdn.net')
  })

  it('should be idempotent', async () => {
    const value = html`<iframe src="https://datawrapper.dwcdn.net/bdqZJ/2/" title="Egg prices"></iframe>`
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
