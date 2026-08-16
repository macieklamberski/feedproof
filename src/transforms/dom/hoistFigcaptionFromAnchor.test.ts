import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { hoistFigcaptionFromAnchor } from './hoistFigcaptionFromAnchor.js'

describeForEachParser('hoistFigcaptionFromAnchor', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [hoistFigcaptionFromAnchor(context)])
  }

  it('should move figcaption out of a figure wrapping anchor', async () => {
    const value = html`
      <figure><a href="big.jpg"><img src="small.jpg"><figcaption>caption</figcaption></a></figure>
    `
    const expected = html`
      <figure><a href="big.jpg"><img src="small.jpg"></a><figcaption>caption</figcaption></figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should move figcaption out when the anchor wraps a picture', async () => {
    const value = html`
      <figure><a href="big.jpg"><picture><source srcset="small.webp"><img src="small.jpg"></picture>
      <figcaption>caption</figcaption></a></figure>
    `
    const expected = html`
      <figure><a href="big.jpg"><picture><source srcset="small.webp"><img src="small.jpg"></picture>
      </a><figcaption>caption</figcaption></figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve the anchor href and media when hoisting', async () => {
    const value = html`
      <figure><a href="big.jpg" target="_blank"><img src="small.jpg" alt="art">
      <figcaption>caption</figcaption></a></figure>
    `
    const expected = html`
      <figure><a href="big.jpg" target="_blank"><img src="small.jpg" alt="art"></a>
      <figcaption>caption</figcaption></figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should hoist captions from multiple figures', async () => {
    const value = [
      '<figure><a href="a.jpg"><img src="a-s.jpg"><figcaption>one</figcaption></a></figure>',
      '<figure><a href="b.jpg"><img src="b-s.jpg"><figcaption>two</figcaption></a></figure>',
    ].join('')
    const expected = [
      '<figure><a href="a.jpg"><img src="a-s.jpg"></a><figcaption>one</figcaption></figure>',
      '<figure><a href="b.jpg"><img src="b-s.jpg"></a><figcaption>two</figcaption></figure>',
    ].join('')

    expect(await transform(value)).toBe(expected)
  })

  it('should leave an empty anchor behind when it wrapped only the caption', async () => {
    const value = '<figure><a href="big.jpg"><figcaption>caption</figcaption></a></figure>'
    const expected = '<figure><a href="big.jpg"></a><figcaption>caption</figcaption></figure>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave a normal figure untouched (caption already a sibling)', async () => {
    const value = html`
      <figure><a href="big.jpg"><img src="small.jpg"></a><figcaption>caption</figcaption></figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a figure with no anchor untouched', async () => {
    const value = '<figure><img src="small.jpg"><figcaption>caption</figcaption></figure>'

    expect(await transform(value)).toBe(value)
  })

  it('should leave a link inside the caption untouched', async () => {
    const value = html`
      <figure><img src="small.jpg"><figcaption>see <a href="src.html">source</a></figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a wrapping anchor outside any figure untouched', async () => {
    const value = html`
      <div><a href="big.jpg"><img src="small.jpg"><figcaption>caption</figcaption></a></div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a caption nested deeper than the anchor direct child untouched', async () => {
    const value = html`
      <figure><a href="big.jpg"><div><img src="small.jpg"><figcaption>caption</figcaption></div></a>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <figure><a href="big.jpg"><img src="small.jpg"><figcaption>caption</figcaption></a></figure>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
