import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { notecomFigureEmbedResolver, notecomIframeEmbedResolver } from './notecom.js'

describeForEachParser('notecomFigureEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, notecomFigureEmbedResolver)

  describe('the own-post figure', () => {
    // The shape a note.com feed ships, copied from note.com/info/rss (2026-08-15). The figure
    // renders nothing in a reader, so the note is lost without this.
    it('should mint the player and keep the post url the figure names', async () => {
      const value = html`
        <figure
          name="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          id="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          data-src="https://note.com/katayuma/n/nf938ce640465"
          data-identifier="nf938ce640465"
          embedded-service="note"
          embedded-content-key="emb511d422327bd"
        ></figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'notecom',
        id: 'nf938ce640465',
        src: 'https://note.com/embed/notes/nf938ce640465',
        url: 'https://note.com/katayuma/n/nf938ce640465',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // `data-identifier` is not read, so a figure without it resolves exactly the same way.
    it('should resolve the same without the identifier attribute', async () => {
      const value = html`
        <figure
          name="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          data-src="https://note.com/katayuma/n/nf938ce640465"
          embedded-service="note"
        ></figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'notecom',
        id: 'nf938ce640465',
        src: 'https://note.com/embed/notes/nf938ce640465',
        url: 'https://note.com/katayuma/n/nf938ce640465',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // 33 corpus feeds ship the figure a step further along, its `data-src` already the player.
    // The url form without a user is what the id alone can name.
    it('should take a figure whose source is already the player', async () => {
      const value = html`
        <figure
          name="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          data-src="https://note.com/embed/notes/nf938ce640465"
          embedded-service="note"
        ></figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'notecom',
        id: 'nf938ce640465',
        src: 'https://note.com/embed/notes/nf938ce640465',
        url: 'https://note.com/notes/nf938ce640465',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A percent-encoded segment survives the url parse intact, so the id shape is what stops it
    // reaching the minted player path.
    it('should state nothing for an id that is not a note id', async () => {
      const value = html`
        <figure
          name="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          data-src="https://note.com/katayuma/n/%2e%2e%2fetc"
          embedded-service="note"
        ></figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should state nothing for a figure naming a foreign host', async () => {
      const value = html`
        <figure
          name="63ca0a3d-754d-4c4d-b28c-3d11f8d75988"
          data-src="https://evil.test/note.com/n/nf938ce640465"
          embedded-service="note"
        ></figure>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('notecomIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, notecomIframeEmbedResolver)

  // 255 corpus feeds carry this, every one of them a provider-less placeholder before now.
  it('should resolve the player iframe', async () => {
    const value = html`
      <iframe class="note-embed" src="https://note.com/embed/notes/nf938ce640465"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'notecom',
      id: 'nf938ce640465',
      src: 'https://note.com/embed/notes/nf938ce640465',
      url: 'https://note.com/notes/nf938ce640465',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // The former domain, which 301s to note.com on the same path, so only the current one is minted.
  it('should mint the current host from a note.mu player', async () => {
    const value = html`
      <iframe class="note-embed" src="https://note.mu/embed/notes/nf938ce640465"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'notecom',
      id: 'nf938ce640465',
      src: 'https://note.com/embed/notes/nf938ce640465',
      url: 'https://note.com/notes/nf938ce640465',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // A post page is not a player: framing it would show the whole webpage.
  it('should state nothing for a post page url', async () => {
    const value = html`<iframe src="https://note.com/katayuma/n/nf938ce640465"></iframe>`

    expect(await extract(value)).toBeUndefined()
  })

  // The host alone, with no path to read an id out of.
  it('should state nothing for the note.com home page', async () => {
    const value = html`<iframe src="https://note.com/"></iframe>`

    expect(await extract(value)).toBeUndefined()
  })

  it('should state nothing for another note.com page', async () => {
    const value = html`<iframe src="https://note.com/katayuma"></iframe>`

    expect(await extract(value)).toBeUndefined()
  })
})
