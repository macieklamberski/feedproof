import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { flattenPictureElements } from './flattenPictureElements.js'

// Cases asserted with `toEqualHtml` are the ones where the transform adds an attribute the img
// did not already carry: linkedom and jsdom serialise the added `src`/`srcset` on opposite sides
// of the attributes already there, so only the attribute order differs. Every other case is
// byte-identical under both parsers and uses `toBe`.
describeForEachParser('flattenPictureElements', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [flattenPictureElements(context)])
  }

  it('should promote a webp source onto the inner img', async () => {
    const value = html`
      <picture>
        <source
          type="image/webp"
          srcset="https://example.com/a-650.webp 650w, https://example.com/a-1400.webp 1400w"
        >
        <img
          src="https://example.com/a-650.jpeg"
          srcset="https://example.com/a-650.jpeg 650w, https://example.com/a-1400.jpeg 1400w"
          alt="photo"
          width="1400"
          height="1023"
        >
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a-1400.webp"
        srcset="https://example.com/a-650.webp 650w, https://example.com/a-1400.webp 1400w"
        alt="photo"
        width="1400"
        height="1023"
      >
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should prefer an avif source over a webp source', async () => {
    const value = html`
      <picture>
        <source type="image/avif" srcset="https://example.com/a.avif 1000w">
        <source type="image/webp" srcset="https://example.com/a.webp 1000w">
        <img src="https://example.com/a.jpeg" alt="photo">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a.avif"
        srcset="https://example.com/a.avif 1000w"
        alt="photo"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not promote an art-direction source carrying a media attribute', async () => {
    const value = html`
      <picture>
        <source
          type="image/webp"
          media="(max-width: 600px)"
          srcset="https://example.com/small.webp 600w"
        >
        <img src="https://example.com/a.jpeg" alt="photo">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a.jpeg"
        alt="photo"
      >
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should lift the inner img unchanged when there is no modern source', async () => {
    const value = html`
      <picture>
        <img src="https://example.com/a.jpeg" alt="photo" width="800" height="600">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a.jpeg"
        alt="photo"
        width="800"
        height="600"
      >
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should drop a stale sizes attribute when promoting', async () => {
    const value = html`
      <picture>
        <source type="image/webp" srcset="https://example.com/a.webp 1000w">
        <img
          src="https://example.com/a.jpeg"
          srcset="https://example.com/a.jpeg 1000w"
          sizes="auto"
          alt="photo"
        >
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a.webp"
        srcset="https://example.com/a.webp 1000w"
        alt="photo"
      >
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should leave a bare img unchanged', async () => {
    const value = '<img src="https://example.com/a.jpeg" alt="photo">'

    expect(await transform(value)).toBe(value)
  })

  it('should synthesize an img when the picture has no img fallback', async () => {
    const value = html`
      <picture>
        <source
          type="image/webp"
          srcset="https://example.com/a-650.webp 650w, https://example.com/a-1400.webp 1400w"
        >
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a-1400.webp"
        srcset="https://example.com/a-650.webp 650w, https://example.com/a-1400.webp 1400w"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should drop a picture that has no img and no usable source', async () => {
    const value = html`
      <picture>
        <source type="image/webp">
      </picture>
    `
    const expected = ''

    expect(await transform(value)).toBe(expected)
  })

  it('should drop a picture whose only source has an empty srcset', async () => {
    const value = html`
      <picture>
        <source srcset=",">
      </picture>
    `
    const expected = ''

    expect(await transform(value)).toBe(expected)
  })

  it('should give a src-less img a src from its own srcset', async () => {
    const value = html`
      <picture>
        <img srcset="https://example.com/a-400.jpg 400w, https://example.com/a-800.jpg 800w">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a-800.jpg"
        srcset="https://example.com/a-400.jpg 400w, https://example.com/a-800.jpg 800w"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should flatten multiple pictures in one document', async () => {
    const value = html`
      <picture>
        <source type="image/webp" srcset="https://example.com/a.webp 1000w">
        <img src="https://example.com/a.jpeg" alt="a">
      </picture>
      <picture>
        <source type="image/webp" srcset="https://example.com/b.webp 1000w">
        <img src="https://example.com/b.jpeg" alt="b">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a.webp"
        srcset="https://example.com/a.webp 1000w"
        alt="a"
      >
      <img
        src="https://example.com/b.webp"
        srcset="https://example.com/b.webp 1000w"
        alt="b"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should fall back to a valid source when the preferred one has an empty srcset', async () => {
    const value = html`
      <picture>
        <source type="image/webp" srcset="   ">
        <source srcset="https://example.com/ok.jpg 800w">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/ok.jpg"
        srcset="https://example.com/ok.jpg 800w"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep a real sizes attribute when promoting', async () => {
    const value = html`
      <picture>
        <source
          type="image/webp"
          srcset="https://example.com/a.webp 400w, https://example.com/b.webp 800w"
        >
        <img src="https://example.com/a.jpg" srcset="https://example.com/a.jpg 400w" sizes="50vw">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/b.webp"
        srcset="https://example.com/a.webp 400w, https://example.com/b.webp 800w"
        sizes="50vw"
      >
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should take the last candidate of a density-only srcset', async () => {
    const value = html`
      <picture>
        <source
          type="image/webp"
          srcset="https://example.com/a.webp 1x, https://example.com/a@2x.webp 2x"
        >
        <img src="https://example.com/a.jpeg" alt="photo">
      </picture>
    `
    const expected = html`
      <img
        src="https://example.com/a@2x.webp"
        srcset="https://example.com/a.webp 1x, https://example.com/a@2x.webp 2x"
        alt="photo"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <picture>
        <source type="image/webp" srcset="https://example.com/a.webp 1000w">
        <img src="https://example.com/a.jpeg" alt="photo">
      </picture>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
