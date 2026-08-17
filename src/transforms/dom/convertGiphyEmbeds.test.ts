import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertGiphyEmbeds } from './convertGiphyEmbeds.js'

describeForEachParser('convertGiphyEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertGiphyEmbeds(baseContext)])
  }

  it('should convert the embed iframe into a linked gif', async () => {
    const value = html`
      <iframe
        src="https://giphy.com/embed/3o7TKMt1VVNkHV2PaE"
        width="480"
        height="270"
      ></iframe>
    `
    const expected = html`
      <a href="https://giphy.com/gifs/3o7TKMt1VVNkHV2PaE">
        <img src="https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  // Compared with `toEqualHtml`: the two parsers serialise the added `alt` on opposite sides
  // of the existing `src`, so only an attribute-order-insensitive comparison holds under both.
  it('should carry the iframe title across as alt text', async () => {
    const value = html`
      <iframe
        src="https://giphy.com/embed/abc123"
        title="a
        cat
        waving"
      ></iframe>
    `
    const expected = html`
      <a href="https://giphy.com/gifs/abc123">
        <img
          alt="a cat waving"
          src="https://media.giphy.com/media/abc123/giphy.gif"
        >
      </a>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  // Some feeds put the media url itself in the iframe rather than the embed page.
  it('should read the media host spelling', async () => {
    const value = '<iframe src="https://media.giphy.com/media/abc123/giphy.gif"></iframe>'
    const expected = html`
      <a href="https://giphy.com/gifs/abc123">
        <img src="https://media.giphy.com/media/abc123/giphy.gif">
      </a>
    `

    expect(await transform(value)).toBe(expected)
  })

  // The padding wrapper is not this transform's job: unwrapWrappers dissolves a sole-child
  // wrapper further down the pipeline, so removing it here would be a second implementation of
  // something that already works. Asserted end to end, since that is where the claim holds.
  it('should leave the wrapper for the pipeline to dissolve', async () => {
    const value = html`
      <div class="giphy-embed-container">
        <iframe src="https://giphy.com/embed/abc123"></iframe>
      </div>
    `
    const expected = html`
      <div class="giphy-embed-container">
        <a href="https://giphy.com/gifs/abc123">
          <img src="https://media.giphy.com/media/abc123/giphy.gif">
        </a>
      </div>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave no wrapper behind once the whole pipeline has run', async () => {
    const value = html`
      <div class="giphy-embed-container" style="padding-bottom:56%">
        <iframe src="https://giphy.com/embed/abc123"></iframe>
      </div>
    `
    const expected = html`
      <a href="https://giphy.com/gifs/abc123">
        <img src="https://media.giphy.com/media/abc123/giphy.gif">
      </a>
    `

    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://x.test/p',
    })

    expect(result).toBe(expected)
  })

  it('should leave a giphy url naming no gif alone', async () => {
    const value = '<iframe src="https://giphy.com/about"></iframe>'

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = '<iframe src="https://giphy.com/embed/abc123"></iframe>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
