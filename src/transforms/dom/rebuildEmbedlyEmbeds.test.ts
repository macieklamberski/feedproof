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

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should omit data-thumbnail when there is no image param', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed"
      ></iframe>
    `
    const expected = '<iframe src="https://example.com/embed"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave an embedly iframe with no src param untouched', async () => {
    const value = html`
      <iframe
        src="https://cdn.embedly.com/widgets/media.html?url=https%3A%2F%2Fexample.com"
      ></iframe>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a non-embedly iframe untouched', async () => {
    const value = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
  })

  describe('the payload div, where a refusal costs the whole block', () => {
    it('should convert a video payload into an iframe naming its url', async () => {
      const videoPayload = jsonAttrValue({
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${videoPayload}"
        ></div>
      `
      const expected = '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should carry the payload thumbnail onto the iframe', async () => {
      const thumbnailPayload = jsonAttrValue({
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://img.example.com/poster.jpg',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${thumbnailPayload}"
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
      const richPayload = jsonAttrValue({
        type: 'rich',
        url: 'https://example.com/widget',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${richPayload}"
        ></div>
      `
      const expected = '<iframe src="https://example.com/widget"></iframe>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should convert a block with no payload into a link to its own src', async () => {
      const value = html`
        <div
          data-type="embedly"
          src='https://example.com/thing'
        ></div>
      `
      const expected = '<a href="https://example.com/thing">https://example.com/thing</a>'

      expect(await transform(value)).toEqualHtml(expected)
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

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave a link payload for the cite pass', async () => {
      const linkPayload = jsonAttrValue({
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${linkPayload}"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a payload naming no type for the cite pass', async () => {
      const typelessPayload = jsonAttrValue({
        url: 'https://example.com/post',
        title: 'A post',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${typelessPayload}"
        ></div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    // An oEmbed payload can name its target and its poster without a scheme, and the url
    // passes below supply one, so both are read as they were written.
    it('should convert a video payload whose url is protocol-relative', async () => {
      const relativePayload = jsonAttrValue({
        type: 'video',
        url: '//www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: '//i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      })
      const value = html`
        <div
          data-type="embedly"
          data="${relativePayload}"
        ></div>
      `
      const expected = html`
        <iframe
          src="//www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-thumbnail="//i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        ></iframe>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should produce a youtube placeholder end to end', async () => {
      const videoPayload = jsonAttrValue({
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data="${videoPayload}"
        ></div>
      `
      const expected = html`
        <div
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
        ></div>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    it('should resolve a protocol-relative payload url end to end', async () => {
      const relativePayload = jsonAttrValue({
        type: 'video',
        url: '//www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const value = html`
        <div
          data-type="embedly"
          data="${relativePayload}"
        ></div>
      `
      const expected = html`
        <div
          data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          data-embed-provider="youtube"
          data-embed-id="dQw4w9WgXcQ"
          data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          data-embed-ratio="16/9"
        ></div>
      `

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    // The scheme floor belongs to neutralizeUnsafeUrls, which runs over every carrier the
    // pipeline builds, so the payload url reaches it as Embedly wrote it.
    it('should render a dangerous payload url inert end to end', async () => {
      const unsafeUrlPayload = jsonAttrValue({
        type: 'video',
        url: 'javascript:alert(1)',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/thing"
          data="${unsafeUrlPayload}"
        ></div>
      `
      const expected = html`<iframe src="about:blank"></iframe>`

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    it('should strip the link from a payloadless block with a dangerous src end to end', async () => {
      const value = html`
        <div
          data-type="embedly"
          src="javascript:alert(1)"
        ></div>
      `
      const expected = html`<p>javascript:alert(1)</p>`

      expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
    })

    it('should leave a link payload reaching the cite pass end to end', async () => {
      const linkPayload = jsonAttrValue({
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      })
      const value = html`
        <div
          data-type="embedly"
          src="https://example.com/post"
          data="${linkPayload}"
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

    expect(twice).toEqualHtml(once)
  })
})
