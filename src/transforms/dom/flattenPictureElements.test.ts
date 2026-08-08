import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { flattenPictureElements } from './flattenPictureElements.js'

describeForEachParser('flattenPictureElements', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [flattenPictureElements(context)])
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
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).not.toContain('<source')
    expect(result).toContain('src="https://example.com/a-1400.webp"')
    expect(result).toContain('https://example.com/a-650.webp 650w')
    expect(result).not.toContain('.jpeg')
    expect(result).toContain('alt="photo"')
    expect(result).toContain('width="1400"')
    expect(result).toContain('height="1023"')
  })

  it('should prefer an avif source over a webp source', async () => {
    const value = html`
      <picture>
        <source type="image/avif" srcset="https://example.com/a.avif 1000w">
        <source type="image/webp" srcset="https://example.com/a.webp 1000w">
        <img src="https://example.com/a.jpeg" alt="photo">
      </picture>
    `
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/a.avif"')
    expect(result).not.toContain('.webp')
    expect(result).not.toContain('.jpeg')
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
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).not.toContain('<source')
    expect(result).toContain('src="https://example.com/a.jpeg"')
    expect(result).not.toContain('.webp')
  })

  it('should lift the inner img unchanged when there is no modern source', async () => {
    const value = html`
      <picture>
        <img src="https://example.com/a.jpeg" alt="photo" width="800" height="600">
      </picture>
    `
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).toContain('src="https://example.com/a.jpeg"')
    expect(result).toContain('alt="photo"')
    expect(result).toContain('width="800"')
    expect(result).toContain('height="600"')
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
    const result = await transform(value)

    expect(result).not.toContain('sizes=')
    expect(result).toContain('src="https://example.com/a.webp"')
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
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).not.toContain('<source')
    expect(result).toContain('<img')
    expect(result).toContain('src="https://example.com/a-1400.webp"')
    expect(result).toContain('https://example.com/a-650.webp 650w')
  })

  it('should drop a picture that has no img and no usable source', async () => {
    const value = html`
      <picture>
        <source type="image/webp">
      </picture>
    `
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).not.toContain('<source')
    expect(result).not.toContain('<img')
  })

  it('should drop a picture whose only source has an empty srcset', async () => {
    const value = html`
      <picture>
        <source srcset=",">
      </picture>
    `
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).not.toContain('<img')
  })

  it('should give a src-less img a src from its own srcset', async () => {
    const value = html`
      <picture>
        <img srcset="https://example.com/a-400.jpg 400w, https://example.com/a-800.jpg 800w">
      </picture>
    `
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).toContain('src="https://example.com/a-800.jpg"')
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
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).toContain('src="https://example.com/a.webp"')
    expect(result).toContain('src="https://example.com/b.webp"')
  })

  it('should fall back to a valid source when the preferred one has an empty srcset', async () => {
    const value = html`
      <picture>
        <source type="image/webp" srcset="   ">
        <source srcset="https://example.com/ok.jpg 800w">
      </picture>
    `
    const result = await transform(value)

    expect(result).not.toContain('<picture')
    expect(result).toContain('src="https://example.com/ok.jpg"')
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
    const result = await transform(value)

    expect(result).toContain('sizes="50vw"')
    expect(result).toContain('src="https://example.com/b.webp"')
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
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/a@2x.webp"')
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
