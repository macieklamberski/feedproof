import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertParagraphEmbeds } from './convertParagraphEmbeds.js'

const makeBlock = (source: string, payload?: Record<string, unknown> | string): string => {
  const data =
    payload === undefined
      ? ''
      : ` data="${(typeof payload === 'string' ? payload : JSON.stringify(payload)).replace(/"/g, '&quot;')}"`

  return `<div data-type="embedly" src="${source}"${data}></div>`
}

describeForEachParser('convertParagraphEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertParagraphEmbeds(baseContext)])
  }

  describe('non-link payloads', () => {
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
  })

  describe('payloads that name nothing', () => {
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
  })

  describe('leave-alone cases', () => {
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

  it('should be idempotent', async () => {
    const value = [
      makeBlock('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
      makeBlock('https://example.com/thing'),
    ].join('')
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
