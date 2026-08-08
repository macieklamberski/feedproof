import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { assignVideoPosters } from './assignVideoPosters.js'

describeForEachParser('assignVideoPosters', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [assignVideoPosters(baseContext)])
  }

  it('should replace the resolver thumbnail with the publisher inline poster', async () => {
    const value = html`
      <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<img')
    expect(result).toContain(
      'data-embed-thumbnail="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"',
    )
    expect(result).not.toContain('hqdefault')
  })

  it('should keep a feed-defined thumbnail over an inline poster', async () => {
    const value = html`
      <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      <div data-enclosure data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-embed-thumbnail="https://feed.example.com/thumb.jpg"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<img')
    expect(result).toContain('data-embed-thumbnail="https://feed.example.com/thumb.jpg"')
    expect(result).not.toContain('maxresdefault')
  })

  it('should move an inline poster onto an embed that has no thumbnail', async () => {
    const value = html`
      <img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<img')
    expect(result).toContain(
      'data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"',
    )
  })

  it('should move an image enclosure onto the embed on a video-led item', async () => {
    const value = html`
      <img src="https://media.beehiiv.com/uploads/poster.png" data-enclosure="">
      <div data-embed-src="https://cdn.jwplayer.com/players/abc123.html"></div>
    `
    const result = await transform(value)

    expect(result).not.toContain('<img')
    expect(result).toContain('data-embed-thumbnail="https://media.beehiiv.com/uploads/poster.png"')
  })

  it('should keep an image enclosure when the item has an inline image of its own', async () => {
    const value = html`
      <img src="https://example.com/poster.png" data-enclosure="">
      <img src="https://example.com/content.jpg">
      <div data-embed-src="https://cdn.jwplayer.com/players/abc123.html"></div>
    `
    const result = await transform(value)

    expect(result).toContain('poster.png')
    expect(result).toContain('content.jpg')
  })

  it('should leave a standalone enclosure image when there is no video', async () => {
    const value = html`
      <img src="https://example.com/poster.png" data-enclosure="">
      <p>Just text.</p>
    `
    const result = await transform(value)

    expect(result).toContain('poster.png')
  })

  it('should set the poster on a native video and remove the enclosure image', async () => {
    const value = html`
      <img src="https://example.com/poster.png" data-enclosure="">
      <video><source src="https://example.com/clip.mp4"></video>
    `
    const result = await transform(value)

    expect(result).not.toContain('<img')
    expect(result).toContain('poster="https://example.com/poster.png"')
  })

  it('should keep an unrelated image that is not a video poster', async () => {
    const value = html`
      <img src="https://example.com/photo.jpg">
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
    `
    const result = await transform(value)

    expect(result).toContain('photo.jpg')
  })

  it('should be idempotent', async () => {
    const value = html`
      <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
      <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"></div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
