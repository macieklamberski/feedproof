import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixLazyAudios } from './fixLazyAudios.js'

describeForEachParser('fixLazyAudios', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixLazyAudios(context)])
  }

  it('should promote a lazy data-src into src on a sourceless audio', async () => {
    const value = '<audio data-src="https://example.com/track.mp3"></audio>'
    const result = await transform(value)

    expect(result).toContain(' src="https://example.com/track.mp3"')
  })

  it('should not promote a src when a source child is present', async () => {
    const value = '<audio data-src="https://example.com/track.mp3"><source src="real.mp3"></audio>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not overwrite a usable src', async () => {
    const value = '<audio src="real.mp3" data-src="https://example.com/lazy.mp3"></audio>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should ignore flag-style values that are not URL-shaped', async () => {
    const value = '<audio data-src="loaded"></audio>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<audio data-src="https://example.com/track.mp3"></audio>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
