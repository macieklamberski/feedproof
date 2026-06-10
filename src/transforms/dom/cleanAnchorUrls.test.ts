import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { cleanAnchorUrls } from './cleanAnchorUrls.js'

const stripQueryFn = (url: string) => url.split('?')[0]

describeForEachParser('cleanAnchorUrls', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [cleanAnchorUrls(context)])
  }

  it('should rewrite hrefs with the provided cleanUrlFn', async () => {
    const value = '<a href="https://example.com/page?utm_source=feed">link</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const result = await transform(value, context)

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('utm_source')
  })

  it('should clean every anchor in the document', async () => {
    const value = [
      '<a href="https://example.com/a?utm_source=feed">first</a>',
      '<a href="https://example.com/b?utm_medium=email">second</a>',
    ].join('')
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const result = await transform(value, context)

    expect(result).toContain('href="https://example.com/a"')
    expect(result).toContain('href="https://example.com/b"')
  })

  it('should leave hrefs untouched when cleanUrlFn returns the same value', async () => {
    const value = '<a href="https://example.com/page">link</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const result = await transform(value, context)

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should do nothing when cleanUrlFn is not provided', async () => {
    const value = '<a href="https://example.com/page?utm_source=feed">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page?utm_source=feed"')
  })

  it('should ignore anchors without hrefs', async () => {
    const value = '<a id="top">anchor</a>'
    const context = { ...baseContext, cleanUrlFn: stripQueryFn }
    const result = await transform(value, context)

    expect(result).toContain('<a id="top">anchor</a>')
  })
})
