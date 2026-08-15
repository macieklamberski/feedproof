import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html, jsonAttrValue } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { rebuildEmbedlyEmbeds } from './rebuildEmbedlyEmbeds.js'

// The unrendered carrier: an empty div whose oEmbed payload rides in `data`, which is what a
// publishing platform ships when only its own client fills the block in.
const makeBlock = (source: string, payload?: Record<string, unknown> | string): string => {
  const data = payload === undefined ? '' : ` data="${jsonAttrValue(payload)}"`

  return `<div data-type="embedly" src="${source}"${data}></div>`
}

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
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(result).toContain('data-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"')
    expect(result).not.toContain('cdn.embedly.com')
  })

  it('should unwrap an Embedly-wrapped Datawrapper chart', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2F4%2F&image=https%3A%2F%2Fdatawrapper.dwcdn.net%2FAbCdE%2Fplain-s.png&schema=dwcdn"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://datawrapper.dwcdn.net/AbCdE/4/"')
    expect(result).not.toContain('cdn.embedly.com')
  })

  it('should handle a protocol-relative embedly src', async () => {
    const value = html`<iframe src="//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fvimeo.com%2F76979871"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://vimeo.com/76979871"')
  })

  it('should omit data-thumbnail when there is no image param', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed"></iframe>`
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/embed"')
    expect(result).not.toContain('data-thumbnail')
  })

  it('should leave an embedly iframe with no src param untouched', async () => {
    const value = html`<iframe src="https://cdn.embedly.com/widgets/media.html?url=https%3A%2F%2Fexample.com"></iframe>`
    const result = await transform(value)

    expect(result).toContain('cdn.embedly.com')
  })

  it('should leave a non-embedly iframe untouched', async () => {
    const value = html`<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`

    expect(await transform(value)).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  describe('the payload div, where a refusal costs the whole block', () => {
    it('should convert a video payload into an iframe naming its url', async () => {
      const value = makeBlock('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const expected = html`<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>`

      expect(await transform(value)).toBe(expected)
    })

    it('should carry the payload thumbnail onto the iframe', async () => {
      const value = makeBlock('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://img.example.com/poster.jpg',
      })
      const expected = html`
        <iframe
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-thumbnail="https://img.example.com/poster.jpg"
        ></iframe>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should convert a rich payload the same way', async () => {
      const value = makeBlock('https://example.com/thing', {
        type: 'rich',
        url: 'https://example.com/widget',
      })
      const expected = html`<iframe src="https://example.com/widget"></iframe>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a block with no payload into a link to its own src', async () => {
      const value = makeBlock('https://example.com/thing')
      const expected = html`<a href="https://example.com/thing">https://example.com/thing</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a block with a malformed payload the same way', async () => {
      const value = makeBlock('https://example.com/thing', '{not json')
      const expected = html`<a href="https://example.com/thing">https://example.com/thing</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a link payload for the cite pass', async () => {
      const value = makeBlock('https://example.com/post', {
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      })

      expect(await transform(value)).toBe(value)
    })

    it('should leave a payload naming no type for the cite pass', async () => {
      const value = makeBlock('https://example.com/post', {
        url: 'https://example.com/post',
        title: 'A post',
      })

      expect(await transform(value)).toBe(value)
    })

    it('should leave a video payload whose url is not http', async () => {
      const value = makeBlock('https://example.com/thing', {
        type: 'video',
        url: 'javascript:alert(1)',
      })

      expect(await transform(value)).toBe(value)
    })

    it('should leave a payloadless block whose src is not http', async () => {
      const value = makeBlock('javascript:alert(1)')

      expect(await transform(value)).toBe(value)
    })

    it('should produce a youtube placeholder end to end', async () => {
      const value = makeBlock('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toContain('data-embed-provider="youtube"')
      expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
    })

    it('should leave a link payload reaching the cite pass end to end', async () => {
      const value = makeBlock('https://example.com/post', {
        type: 'link',
        url: 'https://example.com/post',
        title: 'A post',
      })
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toContain('data-cite-provider="paragraph"')
      expect(result).toContain('data-cite-title="A post"')
    })
  })

  it('should be idempotent', async () => {
    const value = [
      html`<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed&image=https%3A%2F%2Fexample.com%2Fp.jpg"></iframe>`,
      makeBlock('https://example.com/thing', { type: 'video', url: 'https://example.com/widget' }),
      makeBlock('https://example.com/thing'),
    ].join('')
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [rebuildEmbedlyEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
