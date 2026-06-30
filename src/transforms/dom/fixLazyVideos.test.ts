import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixLazyVideos } from './fixLazyVideos.js'

describeForEachParser('fixLazyVideos', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixLazyVideos(context)])
  }

  it('should promote a lazy data-poster into poster', async () => {
    const value = '<video data-poster="https://example.com/still.jpg"></video>'
    const result = await transform(value)

    expect(result).toContain(' poster="https://example.com/still.jpg"')
  })

  it('should promote a lazy data-poster even when a source is present', async () => {
    const value =
      '<video data-poster="https://example.com/still.jpg"><source src="clip.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain(' poster="https://example.com/still.jpg"')
  })

  it('should not overwrite an existing poster', async () => {
    const value = '<video poster="real.jpg" data-poster="https://example.com/lazy.jpg"></video>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should promote a lazy data-src into src on a sourceless video', async () => {
    const value = '<video data-src="https://example.com/clip.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain(' src="https://example.com/clip.mp4"')
  })

  it('should not promote a src when a source child is present', async () => {
    const value = '<video data-src="https://example.com/clip.mp4"><source src="real.mp4"></video>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not overwrite a usable src', async () => {
    const value = '<video src="real.mp4" data-src="https://example.com/lazy.mp4"></video>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should ignore flag-style values that are not URL-shaped', async () => {
    const value = '<video data-src="loaded" data-poster="true"></video>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<video data-src="https://example.com/clip.mp4" data-poster="still.jpg"></video>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
