import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { weeblyMediaResolver } from './weebly.js'

describeForEachParser('weeblyMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, weeblyMediaResolver)

  const facade = (style: string) => html`
    <div class="wsite-video-wrapper wsite-video-height-282">
      <div id="wsite-video-container-807467334470573958" class="wsite-video-container">
        <iframe frameborder="0" id="video-iframe-807467334470573958" src="about:blank"></iframe>
        <style>${style}</style>
      </div>
    </div>
  `

  describe('happy paths', () => {
    // Weebly stores the video and its poster under the same name, so the poster carries both
    // the directory and the file name.
    it('should build the video url from the poster', async () => {
      const value = facade(
        '#wsite-video-container-807467334470573958{ background: url(//www.weebly.com/uploads/b/5005989-475656185621122208/delaware_behaving_badly_176.jpg); }',
      )
      const expected: MediaResolverResult = {
        tag: 'video',
        src: '//www.weebly.com/uploads/b/5005989-475656185621122208/delaware_behaving_badly_176.mp4',
        poster:
          '//www.weebly.com/uploads/b/5005989-475656185621122208/delaware_behaving_badly_176.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The play icon on Weebly's CDN sits in the same style block and is not the poster.
    it('should take the uploads url rather than the play icon', async () => {
      const value = facade(
        '#video-iframe-807467334470573958{ background: url(//cdn2.editmysite.com/images/util/videojs/play.png); } #wsite-video-container-807467334470573958{ background: url(//www.weebly.com/uploads/b/1/clip_176.jpg); }',
      )
      const expected: MediaResolverResult = {
        tag: 'video',
        src: '//www.weebly.com/uploads/b/1/clip_176.mp4',
        poster: '//www.weebly.com/uploads/b/1/clip_176.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a name whose size suffix looks like an extension', async () => {
      const value = facade(
        '#wsite-video-container-807467334470573958{ background: url(//www.weebly.com/uploads/b/1/03.05.2022_12.10.58_rec_649.jpg); }',
      )
      const expected: MediaResolverResult = {
        tag: 'video',
        src: '//www.weebly.com/uploads/b/1/03.05.2022_12.10.58_rec_649.mp4',
        poster: '//www.weebly.com/uploads/b/1/03.05.2022_12.10.58_rec_649.jpg',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The style block writes a cache-buster after the file name, and the video keeps it: the
    // extension is what changes between the two files and nothing else is the resolver's to edit.
    it('should build the video url from a poster carrying a cache-buster', async () => {
      const value = facade(
        '#wsite-video-container-807467334470573958{ background: url(//www.weebly.com/uploads/b/1/clip_176.jpg?1600); }',
      )
      const expected: MediaResolverResult = {
        tag: 'video',
        src: '//www.weebly.com/uploads/b/1/clip_176.mp4?1600',
        poster: '//www.weebly.com/uploads/b/1/clip_176.jpg?1600',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a facade carrying no poster', async () => {
      const value = facade('#wsite-video-container-807467334470573958{ background: none; }')

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a poster that is not an upload', async () => {
      const value = facade(
        '#wsite-video-container-807467334470573958{ background: url(//cdn2.editmysite.com/images/util/videojs/play.png); }',
      )

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a wrapper holding a live third-party iframe', async () => {
      const value = html`
        <div class="wsite-video-wrapper">
          <div class="wsite-video-container">
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
            <style>#wsite-video-container-1{ background: url(//www.weebly.com/uploads/b/1/clip.jpg); }</style>
          </div>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a wrapper another pass already resolved', async () => {
      const value = html`
        <div class="wsite-video-wrapper">
          <div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
          <style>#wsite-video-container-1{ background: url(//www.weebly.com/uploads/b/1/clip.jpg); }</style>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('through the pipeline', () => {
    // The resolver hands on the protocol-relative url the style block states, and both fields
    // come out with a scheme.
    it('should give the video and its poster a scheme', async () => {
      const value = facade(
        '#wsite-video-container-807467334470573958{ background: url(//www.weebly.com/uploads/b/1/clip_176.jpg); }',
      )
      const result = await transformContent(value, { parseHtmlFn: parseHtml })

      expect(result).toContainHtml(
        '<video src="https://www.weebly.com/uploads/b/1/clip_176.mp4" poster="https://www.weebly.com/uploads/b/1/clip_176.jpg" controls></video>',
      )
    })
  })
})
