import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { cleanAnchorUrls } from './cleanAnchorUrls.js'

const stripQueryFn = (url: string) => url.split('?')[0]

describeForEachParser('cleanAnchorUrls', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [cleanAnchorUrls(context)])
  }

  it('should rewrite hrefs with the provided cleanUrlFn', async () => {
    const value = '<a href="https://example.com/page?utm_source=feed">link</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const expected = '<a href="https://example.com/page">link</a>'

    expect(await transform(value, context)).toBe(expected)
  })

  it('should clean every anchor in the document', async () => {
    const value = [
      '<a href="https://example.com/a?utm_source=feed">first</a>',
      '<a href="https://example.com/b?utm_medium=email">second</a>',
    ].join('')
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const expected = html`
      <a href="https://example.com/a">first</a>
      <a href="https://example.com/b">second</a>
    `

    expect(await transform(value, context)).toBe(expected)
  })

  it('should leave hrefs untouched when cleanUrlFn returns the same value', async () => {
    const value = '<a href="https://example.com/page">link</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }

    expect(await transform(value, context)).toBe(value)
  })

  it('should do nothing when cleanUrlFn is not provided', async () => {
    const value = '<a href="https://example.com/page?utm_source=feed">link</a>'

    expect(await transform(value)).toBe(value)
  })

  it('should ignore anchors without hrefs', async () => {
    const value = '<a id="top">anchor</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }

    expect(await transform(value, context)).toBe(value)
  })

  it.todo('should surface errors when cleanUrlFn throws', () => {
    // cleanUrlFn throwing mid-document currently propagates out of the transform and rejects the
    // whole pipeline. Whether it should propagate or skip the offending anchor is an open design
    // question, so the contract is not pinned yet.
  })

  it('should be idempotent', async () => {
    const value = '<a href="https://example.com/page?utm_source=feed">link</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const once = await transform(value, context)
    const twice = await transform(once, context)

    expect(twice).toBe(once)
  })
})
