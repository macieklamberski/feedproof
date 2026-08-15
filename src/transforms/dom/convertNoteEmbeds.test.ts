import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertNoteEmbeds } from './convertNoteEmbeds.js'

const makeFigure = (service: string, src: string, inner = ''): string => {
  return `<figure name="80c4d437-61f6-4500-9007-1a4ac10bdd2e" data-src="${src}" data-identifier="n1234" embedded-service="${service}" embedded-content-key="emb123">${inner}</figure>`
}

describeForEachParser('convertNoteEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertNoteEmbeds(baseContext)])
  }

  describe('media services', () => {
    it('should convert a youtube figure into an iframe', async () => {
      const value = makeFigure('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      const result = await transform(value)

      expect(result).toBe(html`<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>`)
    })

    it('should convert a spotify figure into an iframe', async () => {
      const value = makeFigure('spotify', 'https://open.spotify.com/embed-podcast/episode/2H7N34Z')
      const result = await transform(value)

      expect(result).toBe(
        html`<iframe src="https://open.spotify.com/embed-podcast/episode/2H7N34Z"></iframe>`,
      )
    })

    it('should convert an oembed figure into an iframe', async () => {
      const value = makeFigure('oembed', 'https://adventar.org/calendars/11560')
      const result = await transform(value)

      expect(result).toBe(html`<iframe src="https://adventar.org/calendars/11560"></iframe>`)
    })
  })

  describe('own-post embeds', () => {
    it('should convert a note figure into a plain link', async () => {
      const value = makeFigure('note', 'https://note.com/info/n/ne5fc6bd602c8')
      const result = await transform(value)

      expect(result).toBe(
        html`<a href="https://note.com/info/n/ne5fc6bd602c8">https://note.com/info/n/ne5fc6bd602c8</a>`,
      )
    })
  })

  describe('services the transform does not know', () => {
    // note.com owns the service list and grows it without warning, so an unrecognised figure
    // degrades to its url rather than reaching a reader as a figure that renders nothing.
    it('should convert a twitter figure into a plain link', async () => {
      const value = makeFigure('twitter', 'https://x.com/hoxai/status/2040742008386634171')
      const expected = html`<a href="https://x.com/hoxai/status/2040742008386634171">https://x.com/hoxai/status/2040742008386634171</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a threads figure into a plain link', async () => {
      const value = makeFigure('threads', 'https://www.threads.com/@voicewatanabe/post/DYywU')
      const expected = html`<a href="https://www.threads.com/@voicewatanabe/post/DYywU">https://www.threads.com/@voicewatanabe/post/DYywU</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a codepen figure into a plain link', async () => {
      const value = makeFigure('codepen', 'https://codepen.io/oclockten/pen/zxqLGrz')
      const expected = html`<a href="https://codepen.io/oclockten/pen/zxqLGrz">https://codepen.io/oclockten/pen/zxqLGrz</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should leave an unknown service with a non-http data-src untouched', async () => {
      const value = makeFigure('codepen', 'javascript:alert(1)')

      expect(await transform(value)).toBe(value)
    })

    // Replacing it would throw away whatever it is already showing.
    it('should leave an unknown service that already holds markup', async () => {
      const value = makeFigure(
        'shopping',
        'https://example.com/item',
        '<a href="https://example.com/item">An item</a>',
      )

      expect(await transform(value)).toBe(value)
    })
  })

  describe('leave-alone cases', () => {
    // A real card carries its anchor, so the figure is not empty and the cite pass owns it.
    it('should leave an external-article figure for the cite pass', async () => {
      const value = makeFigure(
        'external-article',
        'https://example.com/article',
        '<a href="https://example.com/article"><strong>A title</strong></a>',
      )
      const result = await transform(value)

      expect(result).toContain('embedded-service="external-article"')
    })

    it('should leave a figure with a non-http data-src untouched', async () => {
      const value = makeFigure('youtube', 'javascript:alert(1)')
      const result = await transform(value)

      expect(result).toContain('embedded-service="youtube"')
    })

    it('should leave a figure with an empty data-src untouched', async () => {
      const value = makeFigure('youtube', '')
      const result = await transform(value)

      expect(result).toContain('embedded-service="youtube"')
    })

    it('should leave a figure without embedded-service untouched', async () => {
      const value = html`<figure data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></figure>`
      const result = await transform(value)

      expect(result).toContain('<figure')
    })
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = makeFigure('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://note.com/user/n/n1234',
    })

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-id="dQw4w9WgXcQ"')
  })

  it('should surface an unknown service as a link end to end', async () => {
    const value = makeFigure('codepen', 'https://codepen.io/oclockten/pen/zxqLGrz')
    const expected = html`<p><a href="https://codepen.io/oclockten/pen/zxqLGrz">https://codepen.io/oclockten/pen/zxqLGrz</a></p>`

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should be idempotent', async () => {
    const value = [
      makeFigure('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      makeFigure('note', 'https://note.com/info/n/ne5fc6bd602c8'),
    ].join('')
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
