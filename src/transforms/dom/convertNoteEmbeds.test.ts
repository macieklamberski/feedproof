import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertNoteEmbeds } from './convertNoteEmbeds.js'

describeForEachParser('convertNoteEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertNoteEmbeds(baseContext)])
  }

  describe('services no resolver claims', () => {
    // note.com owns the service list and grows it without warning, so a figure whose url nothing
    // claims degrades to that url rather than reaching a reader as a figure that renders nothing.
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

    // A registry check is not a framability check. This page frames fine, so the old allowlist
    // reached a working placeholder for it and this degrades it to a link. Framability needs a
    // network round trip, which `extract` may not do, so the trade is accepted rather than solved.
    it('should degrade a framable url no resolver claims to a link', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://adventar.org/calendars/11560"
          data-identifier="n1234"
          embedded-service="oembed"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`
        <a href="https://adventar.org/calendars/11560">https://adventar.org/calendars/11560</a>
      `

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

  describe('services a resolver claims', () => {
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

    // Spotify reaches a feed as `oembed`, not as a service of its own: it did not appear once
    // under its own name across 2,496 sampled articles.
    it('should convert a spotify url arriving as oembed into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t"
          data-identifier="n1234"
          embedded-service="oembed"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`
        <iframe src="https://open.spotify.com/track/03yOjwHoOPDlTUg0NRxN6t"></iframe>
      `

      expect(await transform(value)).toBe(expected)
    })

    // The second-largest embed kind note.com ships after its own posts and YouTube. The status
    // page url is a carrier the twitter resolver reads, so the figure becomes the frame it claims
    // instead of the link it used to degrade to.
    it('should convert a twitter figure into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://x.com/hoxai/status/2040742008386634171"
          data-identifier="n1234"
          embedded-service="twitter"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`
        <iframe src="https://x.com/hoxai/status/2040742008386634171"></iframe>
      `

      expect(await transform(value)).toBe(expected)
    })

    // `embedded-service` is matched on but never read, so a value nobody has catalogued behaves
    // exactly like a known one: the url decides.
    it('should convert a figure whose service it has never seen', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://vimeo.com/76979871"
          data-identifier="n1234"
          embedded-service="somethingNoOneHasCatalogued"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<iframe src="https://vimeo.com/76979871"></iframe>`

      expect(await transform(value)).toBe(expected)
    })

    // The own-post figure is no longer special: its url is a carrier the note.com resolver reads.
    it('should convert a note figure into an iframe', async () => {
      const value = html`
        <figure
          name="80c4d437-61f6-4500-9007-1a4ac10bdd2e"
          data-src="https://note.com/info/n/ne5fc6bd602c8"
          data-identifier="n1234"
          embedded-service="note"
          embedded-content-key="emb123"
        ></figure>
      `
      const expected = html`<iframe src="https://note.com/info/n/ne5fc6bd602c8"></iframe>`

      expect(await transform(value)).toBe(expected)
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
