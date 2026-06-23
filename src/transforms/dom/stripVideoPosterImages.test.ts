import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { stripVideoPosterImages } from './stripVideoPosterImages.js'

describeForEachParser('stripVideoPosterImages', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [stripVideoPosterImages(baseContext)])
  }

  it('should remove a poster image matching an embedded video by id', async () => {
    const value = html`
      <figure>
        <img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      </figure>
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('maxresdefault.jpg')
    expect(result).toContain('data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
  })

  it('should remove the empty figure wrapper left behind', async () => {
    const value = html`
      <figure><img src="https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"></figure>
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<figure')
  })

  it('should match against a raw iframe embed', async () => {
    const value = html`
      <img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg">
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    `
    const result = await transform(value)

    expect(result).not.toContain('hqdefault.jpg')
  })

  it('should keep a poster image when no matching video is embedded', async () => {
    const value = html`
      <img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg">
      <p>No embed here</p>
    `
    const result = await transform(value)

    expect(result).toContain('hqdefault.jpg')
  })

  it('should keep a thumbnail whose id does not match the embedded video', async () => {
    const value = html`
      <img src="https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg">
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
    `
    const result = await transform(value)

    expect(result).toContain('aaaaaaaaaaa')
  })

  it('should keep a regular content image alongside an embed', async () => {
    const value = html`
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
      <img src="https://example.com/photo.jpg">
    `
    const result = await transform(value)

    expect(result).toContain('photo.jpg')
  })
})
