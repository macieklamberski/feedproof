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
