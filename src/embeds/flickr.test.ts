import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { flickrEmbedResolver, flickrResolveEmbed } from './flickr.js'

describeForEachParser('flickrEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, flickrEmbedResolver)

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

  // The other Flash-era carrier: an iframe on `flickr.com/slideshow/index.gne`, whose target
  // 302s to a page that refuses framing, so it renders an empty box today. Its subject is in
  // its own query. Of the 112 corpus feeds carrying it, 94 name a set and 90 name a user.
  describe('the legacy slideshow iframe', () => {
    it('should map a set slideshow onto the album player', async () => {
      const value = html`
        <iframe
          src="https://www.flickr.com/slideShow/index.gne?user_id=12345678@N00&amp;set_id=72157624341"
          width="500"
          height="375"
          frameBorder="0"
          scrolling="no"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: '12345678@N00/72157624341',
        src: 'https://embedr.flickr.com/photosets/72157624341?width=500&height=375',
        url: 'https://www.flickr.com/photos/12345678@N00/sets/72157624341',
        width: 500,
        height: 375,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should map a photostream slideshow onto the stream player', async () => {
      const value = html`
        <iframe src="https://www.flickr.com/slideShow/index.gne?user_id=12345678@N04" width="500" height="500"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: 'photostreams/12345678@N04',
        src: 'https://embedr.flickr.com/photostreams/12345678@N04?width=500&height=500',
        url: 'https://www.flickr.com/photos/12345678@N04/',
        width: 500,
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the set alone when the query names no user', async () => {
      const value = html`
        <iframe src="https://www.flickr.com/slideshow/index.gne?set_id=72157624341"></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'flickr',
        id: 'photosets/72157624341',
        src: 'https://embedr.flickr.com/photosets/72157624341?width=400&height=300',
        width: 400,
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The group player answers 404 on embedr, so a group slideshow has no working target.
    it('should return undefined for a group slideshow', async () => {
      const value = html`
        <iframe src="https://www.flickr.com/slideShow/index.gne?group_id=797770@N21&amp;user_id=&amp;set_id="></iframe>
      `

      expect(await extract(value)).toBeUndefined()
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

// The factory checks the host before calling in, so this guard is only reachable by calling
// the function itself, which is importable on its own.
describeForEachParser('flickrResolveEmbed', (parseHtml) => {
  it('should return undefined for a url that cannot be parsed', () => {
    const element = parseHtml('<embed></embed>').querySelector('embed') as Element

    expect(flickrResolveEmbed('https://[', element)).toBeUndefined()
  })
})
