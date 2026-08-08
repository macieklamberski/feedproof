import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertAmpElements } from './convertAmpElements.js'

describeForEachParser('convertAmpElements', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertAmpElements(context)])
  }

  it('should convert amp-img into img carrying its image attributes', async () => {
    const value = '<amp-img src="photo.jpg" alt="A photo" width="640" height="480"></amp-img>'
    const result = await transform(value)

    expect(result).toContain('<img')
    expect(result).toContain('src="photo.jpg"')
    expect(result).toContain('alt="A photo"')
    expect(result).toContain('width="640"')
    expect(result).not.toContain('<amp-img')
  })

  it('should carry AMP layout attributes over and still drop fallback children', async () => {
    const value = html`
      <amp-img src="photo.jpg" layout="responsive">
        <img src="fallback.jpg" fallback>
      </amp-img>
    `
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
    expect(result).toContain('layout="responsive"')
    expect(result).not.toContain('fallback.jpg')
  })

  it('should carry attributes the element type allows beyond the AMP basics', async () => {
    const value = html`
      <amp-video src="clip.mp4" preload="none" playsinline crossorigin="anonymous"></amp-video>
    `
    const result = await transform(value)

    expect(result).toContain('preload="none"')
    expect(result).toContain('playsinline')
    expect(result).toContain('crossorigin="anonymous"')
  })

  it('should convert amp-anim into img', async () => {
    const value = '<amp-anim src="loop.gif" width="200" height="200"></amp-anim>'
    const result = await transform(value)

    expect(result).toContain('<img')
    expect(result).toContain('src="loop.gif"')
  })

  it('should convert amp-video into video and carry its sources', async () => {
    const value = html`
      <amp-video poster="poster.jpg" width="640" height="360" controls>
        <source src="clip.mp4" type="video/mp4">
      </amp-video>
    `
    const result = await transform(value)

    expect(result).toContain('<video')
    expect(result).toContain('poster="poster.jpg"')
    expect(result).toContain('<source')
    expect(result).toContain('src="clip.mp4"')
    expect(result).not.toContain('<amp-video')
  })

  it('should convert amp-audio into audio and carry its sources', async () => {
    const value = html`
      <amp-audio>
        <source src="track.mp3" type="audio/mpeg">
      </amp-audio>
    `
    const result = await transform(value)

    expect(result).toContain('<audio')
    expect(result).toContain('src="track.mp3"')
  })

  it('should convert amp-iframe into iframe', async () => {
    const value =
      '<amp-iframe src="https://example.com/embed" width="600" height="400"></amp-iframe>'
    const result = await transform(value)

    expect(result).toContain('<iframe')
    expect(result).toContain('src="https://example.com/embed"')
    expect(result).not.toContain('<amp-iframe')
  })

  it('should convert amp-youtube into a youtube embed iframe', async () => {
    const value = '<amp-youtube data-videoid="dQw4w9WgXcQ" width="480" height="270"></amp-youtube>'
    const result = await transform(value)

    expect(result).toContain('<iframe')
    expect(result).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
  })

  // The id is whatever the publisher wrote. A broken one yields a broken embed, which is what
  // the source said, and matches every other transform that builds one of these urls.
  it('should build the embed from a malformed videoid as it stands', async () => {
    const value = '<amp-youtube data-videoid="../../evil"></amp-youtube>'
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/../../evil"')
  })

  it('should leave amp-youtube without a videoid untouched', async () => {
    const value = '<amp-youtube></amp-youtube>'
    const result = await transform(value)

    expect(result).not.toContain('<iframe')
  })

  it('should leave amp-story alone', async () => {
    const value = '<amp-story standalone></amp-story>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<amp-img src="photo.jpg" alt="A photo"></amp-img>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
