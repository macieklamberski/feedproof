import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { simplifyFigures } from './simplifyFigures.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('simplifyFigures', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, simplifyFigures(context))
  }

  it('should unwrap p containing a single img', async () => {
    const value = `
      <figure>
        <p><img src="photo.jpg"></p>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap p containing img with whitespace', async () => {
    const value = `
      <figure>
        <p> <img src="photo.jpg"> </p>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap p containing picture element', async () => {
    const value = `
      <figure>
        <p>
          <picture>
            <source srcset="img.webp">
            <img src="img.jpg">
          </picture>
        </p>
      </figure>
    `
    const expected = `
      <figure>
        <picture>
            <source srcset="img.webp">
            <img src="img.jpg">
          </picture>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap p containing video element', async () => {
    const value = `
      <figure>
        <p><video src="clip.mp4"></video></p>
      </figure>
    `
    const expected = `
      <figure>
        <video src="clip.mp4"></video>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap p containing audio element', async () => {
    const value = `
      <figure>
        <p><audio src="song.mp3"></audio></p>
      </figure>
    `
    const expected = `
      <figure>
        <audio src="song.mp3"></audio>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap span containing only media', async () => {
    const value = `
      <figure>
        <span><img src="photo.jpg"></span>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap div containing only media', async () => {
    const value = `
      <figure>
        <div><img src="photo.jpg"></div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap nested div > p > img', async () => {
    const value = `
      <figure>
        <div>
          <p><img src="photo.jpg"></p>
        </div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap deeply nested div > div > img', async () => {
    const value = `
      <figure>
        <div>
          <div><img src="photo.jpg"></div>
        </div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap triple nested div > div > div > img', async () => {
    const value = `
      <figure>
        <div>
          <div>
            <div><img src="photo.jpg"></div>
          </div>
        </div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap div with attributes containing only media', async () => {
    const value = `
      <figure>
        <div class="photo" id="main">
          <img src="photo.jpg">
        </div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap multiple media-only p wrappers', async () => {
    const value = `
      <figure>
        <p><img src="a.jpg"></p>
        <p><img src="b.jpg"></p>
        <figcaption>Gallery</figcaption>
      </figure>
    `
    const expected = `
      <figure>
        <img src="a.jpg">
        <img src="b.jpg">
        <figcaption>Gallery</figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should unwrap div inside figcaption when sole child', async () => {
    const value = `
      <figure>
        <img src="photo.jpg">
        <figcaption>
          <div><span>Caption</span></div>
        </figcaption>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg">
        <figcaption>
          <span>Caption</span>
        </figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve p with text and img', async () => {
    const value = `
      <figure>
        <p>Caption: <img src="photo.jpg"></p>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve div with non-media children', async () => {
    const value = `
      <figure>
        <div><p>Text paragraph</p></div>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve link wrapping an image inside figure', async () => {
    const value = `
      <figure>
        <a href="https://example.com"><img src="photo.jpg"></a>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve link inside div wrapping an image', async () => {
    const value = `
      <figure>
        <div>
          <a href="https://example.com"><img src="photo.jpg"></a>
        </div>
        <figcaption>Caption</figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not touch p or div outside figure', async () => {
    const value = '<p><img src="photo.jpg"></p>'

    expect(await transform(value)).toBe(value)
  })

  it('should not touch text content inside figcaption', async () => {
    const value = `
      <figure>
        <img src="photo.jpg">
        <figcaption><p>Caption text</p></figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve figcaption div when text siblings exist', async () => {
    const value = `
      <figure>
        <img src="photo.jpg">
        <figcaption>Text<div>More</div></figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should handle figure with no children', async () => {
    const value = '<figure></figure>'

    expect(await transform(value)).toBe(value)
  })

  it('should handle html with no figures', async () => {
    const value = '<p>No figures here</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should handle multiple figures independently', async () => {
    const value = `
      <figure>
        <p><img src="a.jpg"></p>
      </figure>
      <figure>
        <div><img src="b.jpg"></div>
      </figure>
    `
    const expected = `
      <figure>
        <img src="a.jpg">
      </figure>
      <figure>
        <img src="b.jpg">
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should handle the full example from requirements', async () => {
    const value = `
      <figure>
        <div>
          <p><img src="photo.jpg" alt="" height="720" width="1280"></p>
        </div>
        <figcaption>
          <span>2019's <em>Parasite</em></span>
        </figcaption>
      </figure>
    `
    const expected = `
      <figure>
        <img src="photo.jpg" alt="" height="720" width="1280">
        <figcaption>
          <span>2019's <em>Parasite</em></span>
        </figcaption>
      </figure>
    `

    expect(await transform(value)).toBe(expected)
  })
})
