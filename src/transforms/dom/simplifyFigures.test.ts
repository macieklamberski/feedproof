import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { simplifyFigures } from './simplifyFigures.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('simplifyFigures', () => {
  const simplify = simplifyFigures(context)

  it('should unwrap p containing a single img', async () => {
    const html = `
      <figure>
        <p><img src="photo.jpg"></p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap p containing img with whitespace', async () => {
    const html = `
      <figure>
        <p> <img src="photo.jpg"> </p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap p containing picture element', async () => {
    const html = `
      <figure>
        <p>
          <picture>
            <source srcset="img.webp">
            <img src="img.jpg">
          </picture>
        </p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<picture>')
  })

  it('should unwrap p containing video element', async () => {
    const html = `
      <figure>
        <p><video src="clip.mp4"></video></p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<video src="clip.mp4">')
  })

  it('should unwrap p containing audio element', async () => {
    const html = `
      <figure>
        <p><audio src="song.mp3"></audio></p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<audio src="song.mp3">')
  })

  it('should unwrap span containing only media', async () => {
    const html = `
      <figure>
        <span><img src="photo.jpg"></span>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<span>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap div containing only media', async () => {
    const html = `
      <figure>
        <div><img src="photo.jpg"></div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap nested div > p > img', async () => {
    const html = `
      <figure>
        <div>
          <p><img src="photo.jpg"></p>
        </div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div>')
    expect(result).not.toContain('<p>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap deeply nested div > div > img', async () => {
    const html = `
      <figure>
        <div>
          <div><img src="photo.jpg"></div>
        </div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap triple nested div > div > div > img', async () => {
    const html = `
      <figure>
        <div>
          <div>
            <div><img src="photo.jpg"></div>
          </div>
        </div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div>')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap div with attributes containing only media', async () => {
    const html = `
      <figure>
        <div class="photo" id="main">
          <img src="photo.jpg">
        </div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div')
    expect(result).toContain('<img src="photo.jpg">')
  })

  it('should unwrap multiple media-only p wrappers', async () => {
    const html = `
      <figure>
        <p><img src="a.jpg"></p>
        <p><img src="b.jpg"></p>
        <figcaption>Gallery</figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).toContain('<img src="a.jpg">')
    expect(result).toContain('<img src="b.jpg">')
    expect(result).toContain('<figcaption>Gallery</figcaption>')
  })

  it('should unwrap div inside figcaption when sole child', async () => {
    const html = `
      <figure>
        <img src="photo.jpg">
        <figcaption>
          <div><span>Caption</span></div>
        </figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<figcaption><span>Caption</span></figcaption>')
    expect(result).not.toContain('<figcaption><div>')
  })

  it('should preserve p with text and img', async () => {
    const html = `
      <figure>
        <p>Caption: <img src="photo.jpg"></p>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<p>Caption: <img src="photo.jpg"></p>')
  })

  it('should preserve div with non-media children', async () => {
    const html = `
      <figure>
        <div><p>Text paragraph</p></div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<div>')
    expect(result).toContain('<p>Text paragraph</p>')
  })

  it('should preserve link wrapping an image inside figure', async () => {
    const html = `
      <figure>
        <a href="https://example.com"><img src="photo.jpg"></a>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<a href="https://example.com"><img src="photo.jpg"></a>')
  })

  it('should preserve link inside div wrapping an image', async () => {
    const html = `
      <figure>
        <div>
          <a href="https://example.com"><img src="photo.jpg"></a>
        </div>
        <figcaption>Caption</figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<div>')
    expect(result).toContain('<a href="https://example.com"><img src="photo.jpg"></a>')
  })

  it('should not touch p or div outside figure', async () => {
    const result = await transformHtml('<p><img src="photo.jpg"></p>', simplify)

    expect(result).toContain('<p><img src="photo.jpg"></p>')
  })

  it('should not touch text content inside figcaption', async () => {
    const html = `
      <figure>
        <img src="photo.jpg">
        <figcaption><p>Caption text</p></figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<figcaption><p>Caption text</p></figcaption>')
  })

  it('should preserve figcaption div when text siblings exist', async () => {
    const html = `
      <figure>
        <img src="photo.jpg">
        <figcaption>Text<div>More</div></figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).toContain('<figcaption>Text<div>More</div></figcaption>')
  })

  it('should handle figure with no children', async () => {
    const result = await transformHtml('<figure></figure>', simplify)

    expect(result).toContain('<figure></figure>')
  })

  it('should handle html with no figures', async () => {
    const result = await transformHtml('<p>No figures here</p>', simplify)

    expect(result).toContain('<p>No figures here</p>')
  })

  it('should handle multiple figures independently', async () => {
    const html = `
      <figure>
        <p><img src="a.jpg"></p>
      </figure>
      <figure>
        <div><img src="b.jpg"></div>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<p>')
    expect(result).not.toContain('<div>')
    expect(result).toContain('<img src="a.jpg">')
    expect(result).toContain('<img src="b.jpg">')
  })

  it('should handle the full example from requirements', async () => {
    const html = `
      <figure>
        <div>
          <p><img src="photo.jpg" alt="" height="720" width="1280"></p>
        </div>
        <figcaption>
          <span>2019's <em>Parasite</em></span>
        </figcaption>
      </figure>
    `
    const result = await transformHtml(html, simplify)

    expect(result).not.toContain('<div>')
    expect(result).not.toContain('<p>')
    expect(result).toContain('<img src="photo.jpg"')
    expect(result).toContain("<span>2019's <em>Parasite</em></span>")
  })
})
