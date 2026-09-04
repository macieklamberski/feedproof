import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { notecomIframeEmbedResolver, notecomRenderHint } from './notecom.js'

describeForEachParser('notecomIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, notecomIframeEmbedResolver)

  describe('the player', () => {
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

    // The former domain, which 301s to note.com on the same path, so only the current one is
    // minted.
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
  })

  describe('the post page', () => {
    // `convertNoteEmbeds` frames the url note.com's own embed figure names, which is the post
    // rather than the player, so this is the carrier the figure turns into. The post url names
    // the user, so it is stated outright instead of being rebuilt from the id.
    it('should mint the player from a post page url', async () => {
      const value = html`<iframe src="https://note.com/katayuma/n/nf938ce640465"></iframe>`
      const expected: EmbedResolverResult = {
        provider: 'notecom',
        id: 'nf938ce640465',
        src: 'https://note.com/embed/notes/nf938ce640465',
        url: 'https://note.com/katayuma/n/nf938ce640465',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // A percent-encoded segment survives the url parse intact, so the id shape is what stops it
    // reaching the minted player path.
    it('should state nothing for an id that is not a note id', async () => {
      const value = html`<iframe src="https://note.com/katayuma/n/%2e%2e%2fetc"></iframe>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should state nothing for a foreign host carrying the path', async () => {
      const value = html`<iframe src="https://evil.test/note.com/n/nf938ce640465"></iframe>`

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
})

describe('notecomRenderHint', () => {
  it('should read the height off the end of the string', () => {
    const value = 'height::https://note.com/embed/notes/ne5fc6bd602c8::234'

    expect(notecomRenderHint.readHeight?.(value)).toBe(234)
  })

  it('should read nothing out of another string or a non-string', () => {
    expect(notecomRenderHint.readHeight?.('ready')).toBeUndefined()
    expect(notecomRenderHint.readHeight?.({ height: 234 })).toBeUndefined()
  })
})
