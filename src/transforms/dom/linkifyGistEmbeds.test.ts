import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { linkifyGistEmbeds } from './linkifyGistEmbeds.js'

describeForEachParser('linkifyGistEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [linkifyGistEmbeds(baseContext)])
  }

  it('should replace a gist script with a link to the gist', async () => {
    const value = '<script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>'
    const expected = html`
      <a
        href="https://gist.github.com/octocat/6cad326836d38bd3a7ae"
      >https://gist.github.com/octocat/6cad326836d38bd3a7ae</a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should handle a user-less gist url', async () => {
    const value = '<script src="https://gist.github.com/6cad326836d38bd3a7ae.js"></script>'
    const expected = html`
      <a
        href="https://gist.github.com/6cad326836d38bd3a7ae"
      >https://gist.github.com/6cad326836d38bd3a7ae</a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should drop a trailing ?file= query when building the link', async () => {
    const value = html`
      <script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js?file=demo.py"></script>
    `
    const expected = html`
      <a
        href="https://gist.github.com/octocat/6cad326836d38bd3a7ae"
      >https://gist.github.com/octocat/6cad326836d38bd3a7ae</a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should replace an amp-gist with a link built from the bare gist id', async () => {
    const value = html`
      <amp-gist
        data-gistid="b9bb35bc68df68259af94430f012425f"
        layout="fixed-height"
        height="225"
      ></amp-gist>
    `
    const expected = html`
      <a
        href="https://gist.github.com/b9bb35bc68df68259af94430f012425f"
      >https://gist.github.com/b9bb35bc68df68259af94430f012425f</a>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave an amp-gist with a malformed gist id untouched', async () => {
    const value = '<amp-gist data-gistid="../../evil"></amp-gist>'

    expect(await transform(value)).toBe(value)
  })

  it('should leave an amp-gist with an empty gist id untouched', async () => {
    const value = '<amp-gist data-gistid=""></amp-gist>'

    expect(await transform(value)).toBe(value)
  })

  // A script pointing at the gist page rather than its `.js` embed names no gist to link to,
  // so nothing is minted from it.
  it('should leave a gist script that names no embed untouched', async () => {
    const value = '<script src="https://gist.github.com/octocat"></script>'

    expect(await transform(value)).toBe(value)
  })

  it('should leave a non-gist script untouched', async () => {
    const value = '<script src="https://example.com/widget.js"></script>'

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = '<script src="https://gist.github.com/octocat/6cad326836d38bd3a7ae.js"></script>'
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [linkifyGistEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
