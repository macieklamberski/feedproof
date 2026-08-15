import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertNoteEmbeds } from './convertNoteEmbeds.js'

describeForEachParser('convertNoteEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertNoteEmbeds(baseContext)])
  }

  describe('media services', () => {
    it('should convert a youtube figure into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          data-identifier="n1234"
          embedded-service="youtube"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a spotify figure into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://open.spotify.com/embed-podcast/episode/2H7N34Z"
          data-identifier="n1234"
          embedded-service="spotify"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`
        <iframe src="https://open.spotify.com/embed-podcast/episode/2H7N34Z"></iframe>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should convert an oembed figure into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://adventar.org/calendars/11560"
          data-identifier="n1234"
          embedded-service="oembed"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<iframe src="https://adventar.org/calendars/11560"></iframe>`

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('own-post embeds', () => {
    // The figure naming note.com itself belongs to `notecomFigureEmbedResolver`, which mints
    // the player from its id, so this pass leaves it for the widget pass to claim.
    it('should leave a note figure for its own resolver', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://note.com/info/n/ne5fc6bd602c8"
          data-identifier="n1234"
          embedded-service="note"
          embedded-content-key="emb123"
        ></figure>
      `

      expect(await transform(value)).toBe(value)
    })
  })

  describe('services the transform does not know', () => {
    // note.com owns the service list and grows it without warning, so an unrecognised figure
    // degrades to its url rather than reaching a reader as a figure that renders nothing.
    it('should convert a twitter figure into a plain link', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://x.com/hoxai/status/2040742008386634171"
          data-identifier="n1234"
          embedded-service="twitter"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<a href="https://x.com/hoxai/status/2040742008386634171">https://x.com/hoxai/status/2040742008386634171</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a threads figure into a plain link', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://www.threads.com/@voicewatanabe/post/DYywU"
          data-identifier="n1234"
          embedded-service="threads"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<a href="https://www.threads.com/@voicewatanabe/post/DYywU">https://www.threads.com/@voicewatanabe/post/DYywU</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should convert a codepen figure into a plain link', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://codepen.io/oclockten/pen/zxqLGrz"
          data-identifier="n1234"
          embedded-service="codepen"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<a href="https://codepen.io/oclockten/pen/zxqLGrz">https://codepen.io/oclockten/pen/zxqLGrz</a>`

      expect(await transform(value)).toBe(expected)
    })

    it('should leave an unknown service with a non-http data-src untouched', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="javascript:alert(1)"
          data-identifier="n1234"
          embedded-service="codepen"
          embedded-content-key="emb123"
        ></figure>
      `

      expect(await transform(value)).toBe(value)
    })

    // Replacing it would throw away whatever it is already showing.
    it('should leave an unknown service that already holds markup', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://example.com/item"
          data-identifier="n1234"
          embedded-service="shopping"
          embedded-content-key="emb123"
        ><a href="https://example.com/item">An item</a></figure>
      `

      expect(await transform(value)).toBe(value)
    })
  })

  describe('leave-alone cases', () => {
    // A real card carries its anchor, so the figure is not empty and the cite pass owns it.
    it('should leave an external-article figure for the cite pass', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://example.com/article"
          data-identifier="n1234"
          embedded-service="external-article"
          embedded-content-key="emb123"
        ><a href="https://example.com/article"><strong>A title</strong></a></figure>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a figure with a non-http data-src untouched', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="javascript:alert(1)"
          data-identifier="n1234"
          embedded-service="youtube"
          embedded-content-key="emb123"
        ></figure>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a figure with an empty data-src untouched', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src=""
          data-identifier="n1234"
          embedded-service="youtube"
          embedded-content-key="emb123"
        ></figure>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a figure without embedded-service untouched', async () => {
      const value = html`<figure data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></figure>`

      expect(await transform(value)).toBe(value)
    })
  })

  it('should produce a youtube placeholder end to end', async () => {
    const value = html`
      <figure
        name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
        data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-identifier="n1234"
        embedded-service="youtube"
        embedded-content-key="emb123"
      ></figure>
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

    // The two parsers write these five attributes in opposite orders, jsdom keeping the order
    // they were set in and linkedom reversing it, so the comparison has to ignore order.
    expect(
      await transformContent(value, {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://note.com/user/n/n1234',
      }),
    ).toEqualHtml(expected)
  })

  it('should surface an unknown service as a link end to end', async () => {
    const value = html`
      <figure
        name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
        data-src="https://codepen.io/oclockten/pen/zxqLGrz"
        data-identifier="n1234"
        embedded-service="codepen"
        embedded-content-key="emb123"
      ></figure>
    `
    const expected = html`<p><a href="https://codepen.io/oclockten/pen/zxqLGrz">https://codepen.io/oclockten/pen/zxqLGrz</a></p>`

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toBe(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <figure
        name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
        data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        data-identifier="n1234"
        embedded-service="youtube"
        embedded-content-key="emb123"
      ></figure>
      <figure
        name="90c4d437-61f6-4500-9007-1a4ac10bdd2e"
        data-src="https://note.com/info/n/ne5fc6bd602c8"
        data-identifier="n5678"
        embedded-service="note"
        embedded-content-key="emb456"
      ></figure>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
