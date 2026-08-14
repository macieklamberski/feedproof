import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { linkifyGistEmbeds } from './linkifyGistEmbeds.js'

describeForEachParser('linkifyGistEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [linkifyGistEmbeds(baseContext)])
  }

  it('should replace a gist script with a link to the gist', async () => {
    const value = html`<script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>`
    const result = await transform(value)

    expect(result).toContain(
      '<a href="https://gist.github.com/octocat/6cad326836d38bd3a7ae">https://gist.github.com/octocat/6cad326836d38bd3a7ae</a>',
    )
    expect(result).not.toContain('<script')
  })

  it('should handle a user-less gist url', async () => {
    const value = html`<script src="https://gist.github.com/6cad326836d38bd3a7ae.js"></script>`
    const result = await transform(value)

    expect(result).toContain('href="https://gist.github.com/6cad326836d38bd3a7ae"')
  })

  it('should drop a trailing ?file= query when building the link', async () => {
    const value = html`<script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js?file=demo.py"></script>`
    const result = await transform(value)

    expect(result).toContain('href="https://gist.github.com/octocat/6cad326836d38bd3a7ae"')
    expect(result).not.toContain('demo.py')
  })

  it('should replace an amp-gist with a link built from the bare gist id', async () => {
    const value = html`<amp-gist data-gistid="b9bb35bc68df68259af94430f012425f" layout="fixed-height" height="225"></amp-gist>`
    const result = await transform(value)

    expect(result).toContain(
      '<a href="https://gist.github.com/b9bb35bc68df68259af94430f012425f">https://gist.github.com/b9bb35bc68df68259af94430f012425f</a>',
    )
    expect(result).not.toContain('<amp-gist')
  })

  it('should leave an amp-gist with a malformed gist id untouched', async () => {
    const value = html`<amp-gist data-gistid="../../evil"></amp-gist>`
    const result = await transform(value)

    expect(result).toContain('<amp-gist')
    expect(result).not.toContain('<a ')
  })

  it('should leave an amp-gist with an empty gist id untouched', async () => {
    const value = html`<amp-gist data-gistid=""></amp-gist>`
    const result = await transform(value)

    expect(result).toContain('<amp-gist')
    expect(result).not.toContain('<a ')
  })

  // A script pointing at the gist page rather than its `.js` embed names no gist to link to,
  // so nothing is minted from it.
  it('should leave a gist script that names no embed untouched', async () => {
    const value = html`<script src="https://gist.github.com/octocat"></script>`
    const result = await transform(value)

    expect(result).toContain('<script')
    expect(result).not.toContain('<a ')
  })

  it('should leave a non-gist script untouched', async () => {
    const value = html`<script src="https://example.com/widget.js"></script>`
    const result = await transform(value)

    expect(result).toContain('<script')
    expect(result).not.toContain('<a ')
  })

  it('should be idempotent', async () => {
    const value = html`<script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>`
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [linkifyGistEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
