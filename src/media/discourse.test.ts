import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { discourseMediaResolver } from './discourse.js'

const videoSrc = 'https://forum.example.com/uploads/original/3X/9/3/93051db2aa7c.mp4'
const thumbnailSrc = 'https://forum.example.com/uploads/original/3X/5/1/51d8c274da56.jpeg'

describeForEachParser('discourseMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, discourseMediaResolver)

  describe('happy paths', () => {
    it('should rebuild a video with the thumbnail as poster', async () => {
      const value = html`
        <div
          class="video-placeholder-container"
          data-video-src="${videoSrc}"
          data-thumbnail-src="${thumbnailSrc}"
          data-video-base62-sha1="kYB9fkYkZTfdq3QOXOUCWHIxRcl.mp4"
        ></div>
      `
      const expected: MediaResolverResult = { tag: 'video', src: videoSrc, poster: thumbnailSrc }

      expect(await extract(value)).toEqual(expected)
    })

    it('should accept a .mov upload', async () => {
      const source = 'https://forum.example.com/uploads/original/3X/a/b/ab4678a41f56.mov'
      const value = html`
        <div class="video-placeholder-container" data-video-src="${source}"></div>
      `
      const expected: MediaResolverResult = { tag: 'video', src: source }

      expect(await extract(value)).toEqual(expected)
    })

    it('should omit the poster when no thumbnail is present', async () => {
      const value = html`
        <div class="video-placeholder-container" data-video-src="${videoSrc}"></div>
      `
      const expected: MediaResolverResult = { tag: 'video', src: videoSrc }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('reject branches', () => {
    it('should return undefined when the src is not a video file', async () => {
      const value = html`
        <div
          class="video-placeholder-container"
          data-video-src="https://forum.example.com/uploads/stream.m3u8"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the src is empty', async () => {
      const value = html`<div class="video-placeholder-container" data-video-src=""></div>`

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a container without data-video-src', async () => {
      const value = html`<div class="video-placeholder-container"></div>`

      expect(await extract(value)).toBeUndefined()
    })
  })

  it('should produce a playable video with poster end to end', async () => {
    const value = html`
      <p>Watch this:</p>
      <div
        class="video-placeholder-container"
        data-video-src="${videoSrc}"
        data-thumbnail-src="${thumbnailSrc}"
      ></div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://forum.example.com/t/1',
    })

    // The two parsers serialize the video's attributes in different orders, so each is
    // asserted on its own.
    expect(result).toContain('<video')
    expect(result).toContain(`src="${videoSrc}"`)
    expect(result).toContain(`poster="${thumbnailSrc}"`)
    expect(result).toContain('controls')
    expect(result).not.toContain('video-placeholder-container')
  })
})
