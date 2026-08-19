import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, resolverExtractor } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { MediaResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { ghostMediaResolver } from './ghost.js'

describeForEachParser('ghostMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, ghostMediaResolver)

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({ ...baseContext, widgetResolvers: [ghostMediaResolver] }),
    ])
  }

  describe('video cards', () => {
    it('should resolve the upload with the figure thumbnail and dimensions', async () => {
      const value = html`
        <figure class="kg-card kg-video-card" data-kg-thumbnail="https://example.com/thumb.jpg">
          <div class="kg-video-container">
            <video
              src="https://example.com/content/media/clip.mp4"
              poster="https://img.spacergif.org/v1/1920x1080/0a/spacer.png"
              width="1920"
              height="1080"
              playsinline
              preload="metadata"
            ></video>
            <div class="kg-video-overlay">
              <button class="kg-video-large-play-icon"></button>
            </div>
            <div class="kg-video-player-container">
              <div class="kg-video-player">
                <span>0:00</span>
                <span>1:24</span>
              </div>
            </div>
          </div>
        </figure>
      `
      const expected: MediaResolverResult = {
        tag: 'video',
        src: 'https://example.com/content/media/clip.mp4',
        poster: 'https://example.com/thumb.jpg',
        width: 1920,
        height: 1080,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should prefer the custom thumbnail over the generated one', async () => {
      const value = html`
        <figure
          class="kg-video-card"
          data-kg-thumbnail="https://example.com/auto.jpg"
          data-kg-custom-thumbnail="https://example.com/custom.jpg"
        >
          <div class="kg-video-container">
            <video src="https://example.com/clip.mp4"></video>
          </div>
        </figure>
      `
      const expected: MediaResolverResult = {
        tag: 'video',
        src: 'https://example.com/clip.mp4',
        poster: 'https://example.com/custom.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the spacer poster behind when no thumbnail is available', async () => {
      const value = html`
        <figure class="kg-video-card">
          <div class="kg-video-container">
            <video src="https://example.com/clip.mp4" poster="https://img.spacergif.org/v1/s.png"></video>
          </div>
        </figure>
      `
      const expected: MediaResolverResult = { tag: 'video', src: 'https://example.com/clip.mp4' }

      expect(await extract(value)).toEqual(expected)
    })

    it('should replace the chrome container but keep the author caption', async () => {
      const value = html`
        <figure class="kg-card kg-video-card kg-card-hascaption">
          <div class="kg-video-container">
            <video src="https://example.com/clip.mp4"></video>
            <div class="kg-video-overlay"></div>
            <div class="kg-video-player-container">
              <div class="kg-video-player"></div>
            </div>
          </div>
          <figcaption>Watch the full demo below</figcaption>
        </figure>
      `
      const expected = html`
        <figure class="kg-card kg-video-card kg-card-hascaption">
          <video
            src="https://example.com/clip.mp4"
            controls
          ></video>
          <figcaption>Watch the full demo below</figcaption>
        </figure>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should return undefined for a container without a video element', async () => {
      const value = html`
        <figure class="kg-video-card">
          <div class="kg-video-container">
            <div class="kg-video-overlay"></div>
          </div>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match the cleaned form', async () => {
      const value = html`
        <figure class="kg-card kg-video-card">
          <video src="https://example.com/clip.mp4" poster="https://example.com/thumb.jpg" controls></video>
        </figure>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('audio cards', () => {
    it('should resolve the upload and drop the card chrome', async () => {
      const value = html`
        <div class="kg-card kg-audio-card">
          <img src="https://example.com/thumb.jpg" alt="audio-thumbnail" class="kg-audio-thumbnail" />
          <div class="kg-audio-player-container">
            <audio src="https://example.com/content/media/track.mp3" preload="metadata"></audio>
            <div class="kg-audio-title">Track title</div>
            <div class="kg-audio-player">
              <span>0:00</span>
              <span>125.94</span>
            </div>
          </div>
        </div>
      `
      const expected = html`
        <audio
          src="https://example.com/content/media/track.mp3"
          controls
        ></audio>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should return undefined for a card without an audio element', async () => {
      const value = '<div class="kg-audio-card"><div class="kg-audio-player"></div></div>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <figure class="kg-video-card" data-kg-thumbnail="https://example.com/thumb.jpg">
        <div class="kg-video-container">
          <video src="https://example.com/clip.mp4" width="1920" height="1080"></video>
          <div class="kg-video-overlay"></div>
        </div>
      </figure>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
