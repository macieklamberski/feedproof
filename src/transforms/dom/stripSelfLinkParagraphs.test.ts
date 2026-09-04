import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripSelfLinkParagraphs } from './stripSelfLinkParagraphs.js'

describeForEachParser('stripSelfLinkParagraphs', (parseHtml) => {
  const context: TransformContext = {
    ...baseContext,
    baseUrl: 'https://example.com/2026/08/02/tendrils/',
  }
  const transform = (value: string, transformContext: TransformContext = context) => {
    return applyDomTransforms(parseHtml(value), [stripSelfLinkParagraphs(transformContext)])
  }

  it('should remove a trailing paragraph holding only a link to the item page', async () => {
    const value = html`
      <p>Happy Sunday! Lately I have been learning the particle system.</p>
      <p>
        <a
          href="https://example.com/2026/08/02/tendrils/"
          rel="nofollow"
        >Source</a>
      </p>
    `
    const expected = '<p>Happy Sunday! Lately I have been learning the particle system.</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should remove the paragraph when whitespace surrounds the link', async () => {
    const value =
      '<p>Body.</p><p>\n  <a href="https://example.com/2026/08/02/tendrils/">\n  Read more\n  </a>\n</p>'
    const expected = '<p>Body.</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should remove a leading paragraph holding only a link to the item page', async () => {
    const value = html`
      <p><a href="https://example.com/2026/08/02/tendrils/">Tendrils</a></p>
      <p>Body.</p>
    `
    const expected = '<p>Body.</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should remove the paragraph when the link is relative to the item page', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="/2026/08/02/tendrils/">Source</a></p>
    `
    const expected = '<p>Body.</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should remove the paragraph when the link differs only by a trailing slash', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/08/02/tendrils">Source</a></p>
    `
    const expected = '<p>Body.</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep a paragraph linking to another page on the site', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/07/22/opaline-hollow/">Previous</a></p>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a paragraph linking to a page that differs only by query', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/?p=99">Previous</a></p>
    `
    const queryContext: TransformContext = { ...baseContext, baseUrl: 'https://example.com/?p=123' }

    expect(await transform(value, queryContext)).toEqualHtml(value)
  })

  it('should keep a paragraph linking to a section of the item page', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/08/02/tendrils/#gallery">See the gallery</a></p>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a paragraph with text beside the link', async () => {
    const value = html`
      <p>Body.</p>
      <p>Originally published at <a href="https://example.com/2026/08/02/tendrils/">Tendrils</a>.</p>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a paragraph with a second link beside the self link', async () => {
    const value = html`
      <p>Body.</p>
      <p>
        <a href="https://example.com/2026/08/02/tendrils/">HTML</a>
        <a href="https://example.com/2026/08/02/tendrils/download/xml/">XML</a>
      </p>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep a self link wrapping an image', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/08/02/tendrils/"><img src="https://example.com/tendrils.jpg"></a></p>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should keep everything without a base url', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/08/02/tendrils/">Source</a></p>
    `

    expect(await transform(value, baseContext)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Body.</p>
      <p><a href="https://example.com/2026/08/02/tendrils/">Source</a></p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
