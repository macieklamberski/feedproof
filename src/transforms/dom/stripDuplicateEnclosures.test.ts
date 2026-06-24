import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripDuplicateEnclosures } from './stripDuplicateEnclosures.js'

describeForEachParser('stripDuplicateEnclosures', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripDuplicateEnclosures(context)])
  }

  describe('image enclosures', () => {
    it('should remove a marked image that exactly matches a content image', async () => {
      const value = html`
        <img src="https://example.com/photo.jpg" data-enclosure="">
        <p>Content</p>
        <img src="https://example.com/photo.jpg">
      `
      const expected = html`
        <p>Content</p>
        <img src="https://example.com/photo.jpg">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image that is a WordPress sized copy of a content image', async () => {
      const value = html`
        <img src="https://example.com/uploads/photo-800x450.jpg" data-enclosure="">
        <img src="https://example.com/uploads/photo.jpg">
      `
      const expected = '<img src="https://example.com/uploads/photo.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image that is a size-keyword variant of a content image', async () => {
      const value = html`
        <img src="https://example.com/photos/123/456/small.jpg" data-enclosure="">
        <img src="https://example.com/photos/123/456/large.jpg">
      `
      const expected = '<img src="https://example.com/photos/123/456/large.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image differing from a content image only by query', async () => {
      const value = html`
        <img src="https://example.com/a/photo.png?w=1024" data-enclosure="">
        <img src="https://example.com/a/photo.png">
      `
      const expected = '<img src="https://example.com/a/photo.png">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image differing from a content image only by www', async () => {
      const value = html`
        <img src="http://www.example.com/news/thumb.jpg" data-enclosure="">
        <img src="http://example.com/news/thumb.jpg">
      `
      const expected = '<img src="http://example.com/news/thumb.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image differing from a content image only by protocol', async () => {
      const value = html`
        <img src="https://example.com/news/thumb.jpg" data-enclosure="">
        <img src="http://example.com/news/thumb.jpg">
      `
      const expected = '<img src="http://example.com/news/thumb.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked image differing from a content image only by host case', async () => {
      const value = html`
        <img src="https://Example.COM/news/thumb.jpg" data-enclosure="">
        <img src="https://example.com/news/thumb.jpg">
      `
      const expected = '<img src="https://example.com/news/thumb.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep a genuinely different image and drop its marker', async () => {
      const value = html`
        <img src="https://example.com/photos/999/888/large.jpg" data-enclosure="">
        <img src="https://example.com/photos/123/456/large.jpg">
      `
      const expected = html`
        <img src="https://example.com/photos/999/888/large.jpg">
        <img src="https://example.com/photos/123/456/large.jpg">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not collapse unrelated root-level size-keyword files', async () => {
      const value = html`
        <img src="https://example.com/small.jpg" data-enclosure="">
        <img src="https://example.com/large.jpg">
      `

      expect(await transform(value)).toContain('small.jpg')
    })

    it('should remove a content image variant using cleanUrlFn before comparing', async () => {
      const value = html`
        <img src="https://example.com/a/photo.png?ref=1" data-enclosure="">
        <img src="https://example.com/a/photo.png?utm=2">
      `
      const context: TransformContext = {
        ...baseContext,
        cleanUrlFn: (url) => url.split('?')[0],
      }
      const expected = '<img src="https://example.com/a/photo.png?utm=2">'

      expect(await transform(value, context)).toEqualHtml(expected)
    })
  })

  describe('non-image enclosures', () => {
    it('should remove a marked audio that exactly matches a content audio', async () => {
      const value = html`
        <audio src="https://example.com/episode.mp3" data-enclosure=""></audio>
        <audio src="https://example.com/episode.mp3"></audio>
      `
      const expected = '<audio src="https://example.com/episode.mp3"></audio>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep a marked audio whose identity lives in a differing query', async () => {
      const value = html`
        <audio src="https://host.example/play.mp3?url=episodeA" data-enclosure=""></audio>
        <audio src="https://host.example/play.mp3?url=episodeB"></audio>
      `
      const expected = html`
        <audio src="https://host.example/play.mp3?url=episodeA"></audio>
        <audio src="https://host.example/play.mp3?url=episodeB"></audio>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked embed placeholder matching a content embed', async () => {
      const value = html`
        <div data-embed-src="https://www.youtube.com/embed/abc" data-enclosure=""></div>
        <div data-embed-src="https://www.youtube.com/embed/abc"></div>
      `
      const expected = '<div data-embed-src="https://www.youtube.com/embed/abc"></div>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should remove an empty wrapping figure left behind', async () => {
    const value = html`
      <figure><img src="https://example.com/photo.jpg" data-enclosure=""></figure>
      <img src="https://example.com/photo.jpg">
    `
    const expected = '<img src="https://example.com/photo.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should do nothing when there are no marked enclosures', async () => {
    const value = html`
      <p>Content</p>
      <img src="https://example.com/photo.jpg">
    `

    expect(await transform(value)).toEqualHtml(value)
  })
})
