import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html, jsonAttrValue } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildEmbedlyEmbeds } from './rebuildEmbedlyEmbeds.js'

describeForEachParser('rebuildEmbedlyEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [rebuildEmbedlyEmbeds(baseContext)])
  }

  it('should unwrap an Embedly media iframe to the inner src and carry the poster', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ&image=https%3A%2F%2Fi.ytimg.com%2Fvi%2FdQw4w9WgXcQ%2Fhqdefault.jpg&url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ&schema=youtube"
        width="640"
        height="360"
      ></iframe>
    `
    const expected = html`
      <iframe
        data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should unwrap an Embedly-wrapped Datawrapper chart', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2F4%2F&image=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2Fplain-s.png&schema=dwcdn"
      ></iframe>
    `
    const expected = html`
      <iframe
        data-thumbnail="https://datawrapper.dwcdn.net/AbCdE/plain-s.png"
        src="https://datawrapper.dwcdn.net/AbCdE/4/"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle a protocol-relative embedly src', async () => {
    const value = html`
      <iframe
        src="//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fvimeo.com%2F76979871"
      ></iframe>
    `
    const expected = '<iframe src="https://vimeo.com/76979871"></iframe>'

    expect(await transform(value)).toBe(expected)
  })

  it('should omit data-thumbnail when there is no image param', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed"
      ></iframe>
    `
    const expected = '<iframe src="https://example.com/embed"></iframe>'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave an embedly iframe with no src param untouched', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?url=https%3A%2F%2Fexample.com"
      ></iframe>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a non-embedly iframe untouched', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toBe(value)
  })

  describe('the payload div, where a refusal costs the whole block', () => {
    it('should convert a video payload into an iframe naming its url', async () => {
      const videoPayload = {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${jsonAttrValue(videoPayload)}"
        ></div>
      `
      const expected = '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>'

      expect(await transform(value)).toBe(expected)
    })

    it('should carry the payload thumbnail onto the iframe', async () => {
      const thumbnailPayload = {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://img.example.com/poster.jpg',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${jsonAttrValue(thumbnailPayload)}"
        ></div>
      `
      const expected = html`
        <iframe
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-thumbnail="https://img.example.com/poster.jpg"
        ></iframe>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should convert a rich payload the same way', async () => {
      const richPayload = {
        type: 'rich',
        url: 'https://example.com/widget',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${jsonAttrValue(richPayload)}"
        ></div>
      `
      const expected = '<iframe src="https://example.com/widget"></iframe>'

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a block with no payload into a link to its own src', async () => {
      const value = html`
        <div
          data-type="embedly"
          src='https://example.com/thing'
        ></div>
      `
      const expected = '<a href="https://example.com/thing">https://example.com/thing</a>'

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a block with a malformed payload the same way', async () => {
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${jsonAttrValue('{not json')}"
        ></div>
      `
      const expected = '<a href="https://example.com/thing">https://example.com/thing</a>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a link payload for the cite pass', async () => {
      const linkPayload = {
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${jsonAttrValue(linkPayload)}"
        ></div>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a payload naming no type for the cite pass', async () => {
      const typelessPayload = {
        url: 'https://example.com/post',
        title: 'A post',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${jsonAttrValue(typelessPayload)}"
        ></div>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a video payload whose url is not http', async () => {
      const unsafeUrlPayload = {
        type: 'video',
        url: 'javascript:alert(1)',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${jsonAttrValue(unsafeUrlPayload)}"
        ></div>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a payloadless block whose src is not http', async () => {
      const value = html`
        <div
          data-type="embedly"
          src="javascript:alert(1)"
        ></div>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should produce a youtube placeholder end to end', async () => {
      const videoPayload = {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${jsonAttrValue(videoPayload)}"
        ></div>
      `
      const expected = html`
        <div
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        ></div>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    it('should leave a link payload reaching the cite pass end to end', async () => {
      const linkPayload = {
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      }
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${jsonAttrValue(linkPayload)}"
        ></div>
      `
      const expected = html`
        <div
          data-cite-provider="paragraph"
          data-cite-url="https://example.com/post"
          data-cite-title="A post"
        ></div>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = [
      '<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed&image=https%3A%2F%2Fexample.com%2Fp.jpg"></iframe>',
      html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${jsonAttrValue({ type: 'video', url: 'https://example.com/widget' })}"
        ></div>
      `,
      html`
        <div
          data-type="embedly"
          src='https://example.com/thing'
        ></div>
      `,
    ].join('')
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [rebuildEmbedlyEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
