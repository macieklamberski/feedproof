import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { wrapOrphanFigcaptions } from './wrapOrphanFigcaptions.js'

describeForEachParser('wrapOrphanFigcaptions', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [wrapOrphanFigcaptions(context)])
  }

  it('should wrap a paragraph image and its trailing figcaption in a figure', async () => {
    const value = html`
      <p><img src="chart.png"></p>
      <figcaption>The device listing.</figcaption>
    `
    const expected = html`
      <figure>
        <p><img src="chart.png"></p>
        <figcaption>The device listing.</figcaption>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a figcaption that already sits in a figure', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <figcaption>The device listing.</figcaption>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should wrap a group of figures and their shared caption in one figure', async () => {
    const value = html`
      <div>
        <figure><img src="one.png"></figure>
        <figure><img src="two.png"></figure>
        <figcaption>Both of them, together.</figcaption>
      </div>
    `
    const expected = html`
      <div>
        <figure>
          <figure><img src="one.png"></figure>
          <figure><img src="two.png"></figure>
          <figcaption>Both of them, together.</figcaption>
        </figure>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should move a caption following a single figure inside it', async () => {
    const value = html`
      <div>
        <figure><img src="one.png"></figure>
        <figcaption>Just the one.</figcaption>
      </div>
    `
    const expected = html`
      <div>
        <figure>
          <img src="one.png">
          <figcaption>Just the one.</figcaption>
        </figure>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should group figures when the shared caption sits in its own wrapper', async () => {
    const value = html`
      <div>
        <figure><img src="one.png"></figure>
        <figure><img src="two.png"></figure>
        <span class="shared-caption"><figcaption>Both of them, together.</figcaption></span>
      </div>
    `
    const expected = html`
      <div>
        <figure>
          <figure><img src="one.png"></figure>
          <figure><img src="two.png"></figure>
          <figcaption>Both of them, together.</figcaption>
        </figure>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a caption already inside a figure through a wrapper', async () => {
    const value = html`
      <figure>
        <img src="one.png">
        <span class="caption-wrapper"><figcaption>Just the one.</figcaption></span>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a figcaption whose previous block holds several images', async () => {
    const value = html`
      <p>
        <img src="one.png">
        <img src="two.png">
      </p>
      <figcaption>Both of them, together.</figcaption>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a figcaption whose previous block carries prose', async () => {
    const value = html`
      <p>Some text about the image <img src="chart.png"></p>
      <figcaption>The device listing.</figcaption>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a figcaption with no preceding element', async () => {
    const value = html`
      <div>
        <figcaption>An orphan with nothing before it.</figcaption>
        <p><img src="chart.png"></p>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should wrap each of several orphan captions in one pass', async () => {
    const value = html`
      <p><img src="one.png"></p>
      <figcaption>First.</figcaption>
      <p><img src="two.png"></p>
      <figcaption>Second.</figcaption>
    `
    const expected = html`
      <figure>
        <p><img src="one.png"></p>
        <figcaption>First.</figcaption>
      </figure>
      <figure>
        <p><img src="two.png"></p>
        <figcaption>Second.</figcaption>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should wrap a video and its trailing figcaption', async () => {
    const value = html`
      <div><video src="clip.mp4"></video></div>
      <figcaption>A moving picture.</figcaption>
    `
    const expected = html`
      <figure>
        <div><video src="clip.mp4"></video></div>
        <figcaption>A moving picture.</figcaption>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })
})
