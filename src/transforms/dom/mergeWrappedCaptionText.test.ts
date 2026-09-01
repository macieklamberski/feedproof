import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { mergeWrappedCaptionText } from './mergeWrappedCaptionText.js'

describeForEachParser('mergeWrappedCaptionText', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [mergeWrappedCaptionText(context)])
  }

  it('should move a description block preceding the figcaption into it', async () => {
    const value = html`
      <figure>
        <img src="ceres.jpg">
        <div class="img-caption">
          <div class="img-caption__desc">The dwarf planet Ceres.</div>
          <figcaption><a href="https://example.com/source">Credit</a>: NASA/JPL</figcaption>
        </div>
      </figure>
    `
    const expected = html`
      <figure>
        <img src="ceres.jpg">
        <div class="img-caption">
          <figcaption>
            <div class="img-caption__desc">The dwarf planet Ceres.</div>
            <p><a href="https://example.com/source">Credit</a>: NASA/JPL</p>
          </figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should append a text block following the figcaption after its content', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <div>
          <figcaption>The device listing.</figcaption>
          <p>Data from the vendor.</p>
        </div>
      </figure>
    `
    const expected = html`
      <figure>
        <img src="chart.png">
        <div>
          <figcaption>
            <p>The device listing.</p>
            <p>Data from the vendor.</p>
          </figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep several sibling blocks in document order', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <div>
          <p>First line.</p>
          <p>Second line.</p>
          <figcaption>Credit: Someone</figcaption>
        </div>
      </figure>
    `
    const expected = html`
      <figure>
        <img src="chart.png">
        <div>
          <figcaption>
            <p>First line.</p>
            <p>Second line.</p>
            <p>Credit: Someone</p>
          </figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not rewrap a figcaption whose content is already a paragraph', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <div>
          <p>The device listing.</p>
          <figcaption><p>Credit: Someone</p></figcaption>
        </div>
      </figure>
    `
    const expected = html`
      <figure>
        <img src="chart.png">
        <div>
          <figcaption>
            <p>The device listing.</p>
            <p>Credit: Someone</p>
          </figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a figcaption that is a direct child of its figure', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <figcaption>The device listing.</figcaption>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a figcaption alone in its wrapper', async () => {
    const value = html`
      <figure>
        <img src="chart.png">
        <span class="caption-wrapper"><figcaption>The device listing.</figcaption></span>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a wrapper whose sibling holds media', async () => {
    const value = html`
      <figure>
        <div class="kg-card">
          <div class="kg-video-container"><video src="clip.mp4"></video></div>
          <figcaption>A moving picture.</figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a wrapper whose sibling is an embed placeholder', async () => {
    const value = html`
      <figure>
        <div>
          <div data-embed-provider="youtube" data-embed-id="abc123"></div>
          <figcaption>A talk.</figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a wrapper whose sibling carries no text', async () => {
    const value = html`
      <figure>
        <div>
          <div class="spacer"></div>
          <figcaption>The device listing.</figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a wrapper holding two figcaptions', async () => {
    const value = html`
      <figure>
        <div>
          <figcaption>One caption.</figcaption>
          <figcaption>Another caption.</figcaption>
        </div>
      </figure>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a figcaption whose wrapper sits outside any figure', async () => {
    const value = html`
      <div>
        <p>A stray block.</p>
        <figcaption>An orphan caption.</figcaption>
      </div>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <figure>
        <img src="ceres.jpg">
        <div class="img-caption">
          <div class="img-caption__desc">The dwarf planet Ceres.</div>
          <figcaption><a href="https://example.com/source">Credit</a>: NASA/JPL</figcaption>
        </div>
      </figure>
    `

    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
