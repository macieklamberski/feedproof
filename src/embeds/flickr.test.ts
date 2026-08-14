import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { flickrFlashEmbedResolver } from './flickr.js'

describeForEachParser('flickrFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, flickrFlashEmbedResolver)

  describe('the slideshow object and embed pair', () => {
    it('should map the dead player onto the album the flashvars name', async () => {
      const value = html`
        <object width="400" height="300">
          <param
            name="flashvars"
            value="offsite=true&amp;lang=en-us&amp;page_show_url=%2Fphotos%2F12345678%40N00%2Fsets%2F72157624341%2Fshow%2F&amp;user_id=12345678%40N00"
          />
          <param name="movie" value="https://www.flickr.com/apps/slideshow/show.swf?v=143567" />
          <embed
            type="application/x-shockwave-flash"
            src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
            width="400"
            height="300"
          />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: '12345678@N00/72157624341',
        src: 'https://embedr.flickr.com/photosets/72157624341?width=400&height=300',
        url: 'https://www.flickr.com/photos/12345678@N00/sets/72157624341',
        width: 400,
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the config off an embed that carries it itself', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
          flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
          width="640"
          height="480"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: 'bees/72157624341',
        src: 'https://embedr.flickr.com/photosets/72157624341?width=640&height=480',
        url: 'https://www.flickr.com/photos/bees/sets/72157624341',
        width: 640,
        height: 480,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The endpoint renders `width: NaNpx` when it is given no size, so a carrier that states
    // none still has to name one.
    it('should fall back to the dialog size when the carrier states none', async () => {
      const value = html`
        <embed
          src="https://www.flickr.com/apps/slideshow/show.swf"
          flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: 'bees/72157624341',
        src: 'https://embedr.flickr.com/photosets/72157624341?width=400&height=300',
        url: 'https://www.flickr.com/photos/bees/sets/72157624341',
        width: 400,
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the config names no set', async () => {
      const value = html`
        <embed
          src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
          flashvars="offsite=true&amp;lang=en-us"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a carrier with no config at all', async () => {
      const value = html`<embed src="https://www.flickr.com/apps/slideshow/show.swf?v=143567" />`

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a flickr app that is not the slideshow', async () => {
      const value = html`
        <embed
          src="https://www.flickr.com/apps/video/stewart.swf"
          flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an owner outside the url-safe alphabet', async () => {
      const value = html`
        <embed
          src="https://www.flickr.com/apps/slideshow/show.swf"
          flashvars="page_show_url=%2Fphotos%2F..%2F..%2Fsets%2F72157624341%2Fshow%2F"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a carrier on another host', async () => {
      const value = html`
        <embed
          src="https://evil.test/flickr.com/apps/slideshow/show.swf"
          flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
        />
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
