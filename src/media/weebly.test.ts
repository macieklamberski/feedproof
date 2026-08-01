import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { weeblyMediaResolver } from './weebly.js'

// The corpus shape: dead iframe, poster in a kept <style>, file name in the title.
const makeWrapper = (title: string, posterUrl: string): string => {
  return html`
    <div title="${title}" class="wsite-video-wrapper wsite-video-height-282 wsite-video-align-left">
      <div id="wsite-video-container-157814937633963138" class="wsite-video-container">
        <iframe allowfullscreen="true" id="video-iframe-157814937633963138" src="about:blank"></iframe>
        <style>
          #wsite-video-container-157814937633963138{ background: url(${posterUrl}); }
          #video-iframe-157814937633963138{ background: url(//cdn2.editmysite.com/images/util/videojs/play-icon.png?1546460906); }
        </style>
      </div>
    </div>
  `
}

describeForEachParser('weeblyMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(weeblyMediaResolver.selector)

    return element ? (weeblyMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should join the poster directory with the title file name', () => {
      const value = makeWrapper(
        'Video: vid-20181208-wa0003_628.mp4',
        '//www.weebly.com/uploads/b/106894751-580615239224222306/vid-20181208-wa0003_628.jpg',
      )
      const expected: MediaResolverResult = {
        tag: 'video',
        src: 'https://www.weebly.com/uploads/b/106894751-580615239224222306/vid-20181208-wa0003_628.mp4',
        poster:
          'https://www.weebly.com/uploads/b/106894751-580615239224222306/vid-20181208-wa0003_628.jpg',
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should keep an absolute poster url as it is', () => {
      const value = makeWrapper('Video: clip.mp4', 'https://www.example.com/uploads/1/2/3/clip.jpg')

      expect(extract(value)?.src).toBe('https://www.example.com/uploads/1/2/3/clip.mp4')
    })

    it('should resolve an audio file name to an audio element', () => {
      const value = makeWrapper('Video: episode.mp3', '//www.weebly.com/uploads/1/poster.jpg')

      expect(extract(value)?.tag).toBe('audio')
    })
  })

  describe('edge cases', () => {
    it('should return undefined when the title lacks the Video prefix', () => {
      const value = makeWrapper('My holiday clip', '//www.weebly.com/uploads/1/poster.jpg')

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined when the title names a non-media file', () => {
      const value = makeWrapper('Video: notes.pdf', '//www.weebly.com/uploads/1/poster.jpg')

      expect(extract(value)).toBeUndefined()
    })

    // The name is interpolated into a url, so a path-shaped value is dropped.
    it('should return undefined when the file name carries a path', () => {
      const value = makeWrapper('Video: ../../etc/passwd.mp4', '//www.weebly.com/uploads/1/p.jpg')

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined when no uploads poster is present', () => {
      const value = html`
        <div title="Video: clip.mp4" class="wsite-video-wrapper">
          <div class="wsite-video-container">
            <iframe src="about:blank"></iframe>
            <style>
              #video-iframe-1{ background: url(//cdn2.editmysite.com/images/util/videojs/play-icon.png); }
            </style>
          </div>
        </div>
      `

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined when the style block is missing', () => {
      const value = '<div title="Video: clip.mp4" class="wsite-video-wrapper"></div>'

      expect(extract(value)).toBeUndefined()
    })
  })
})
