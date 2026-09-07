import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripDuplicateEnclosures } from './stripDuplicateEnclosures.js'

describeForEachParser('stripDuplicateEnclosures', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripDuplicateEnclosures(context)])
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

    it('should remove a marked Substack image that differs only in proxy render params', async () => {
      const value = html`
        <img src="https://substackcdn.com/image/fetch/$s_!a!,f_auto,q_auto:good/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fabc_1456x1048.png" data-enclosure="">
        <img src="https://substackcdn.com/image/fetch/$s_!a!,w_1456,c_limit,f_webp/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fabc_1456x1048.png">
      `
      const expected = html`
        <img
          src="https://substackcdn.com/image/fetch/$s_!a!,w_1456,c_limit,f_webp/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fabc_1456x1048.png"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep two Substack images with different inner sources', async () => {
      const value = html`
        <img src="https://substackcdn.com/image/fetch/$s_!a!,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Faaa_800x600.png" data-enclosure="">
        <img src="https://substackcdn.com/image/fetch/$s_!a!,w_1456/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbbb_800x600.png">
      `
      const expected = html`
        <img src="https://substackcdn.com/image/fetch/$s_!a!,f_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Faaa_800x600.png">
        <img src="https://substackcdn.com/image/fetch/$s_!a!,w_1456/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbbb_800x600.png">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a marked Photon image that wraps the same origin as the content', async () => {
      const value = html`
        <img src="https://i2.wp.com/example.com/wp-content/uploads/2024/05/photo.png?resize=584,438" data-enclosure="">
        <img src="https://i0.wp.com/example.com/wp-content/uploads/2024/05/photo.png?w=300">
      `
      const expected = html`
        <img src="https://i0.wp.com/example.com/wp-content/uploads/2024/05/photo.png?w=300">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a Photon image that duplicates a non-proxied content image', async () => {
      const value = html`
        <img src="https://i1.wp.com/example.com/wp-content/uploads/photo.png?w=300" data-enclosure="">
        <img src="https://example.com/wp-content/uploads/photo.png">
      `
      const expected = '<img src="https://example.com/wp-content/uploads/photo.png">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a Cloudflare image-resize variant with an absolute source', async () => {
      const value = html`
        <img src="https://site.com/cdn-cgi/image/width=1600,format=webp/https://storage.site.com/asset123" data-enclosure="">
        <img src="https://site.com/cdn-cgi/image/width=400,format=auto/https://storage.site.com/asset123">
      `
      const expected = html`
        <img
          src="https://site.com/cdn-cgi/image/width=400,format=auto/https://storage.site.com/asset123"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a Cloudflare image-resize variant with a relative source (beehiiv)', async () => {
      const value = html`
        <img src="https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,quality=80/uploads/asset/file/uuid/Episode.png" data-enclosure="">
        <img src="https://media.beehiiv.com/cdn-cgi/image/quality=60,format=auto/uploads/asset/file/uuid/Episode.png">
      `
      const expected = html`
        <img
          src="https://media.beehiiv.com/cdn-cgi/image/quality=60,format=auto/uploads/asset/file/uuid/Episode.png"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove an ImageKit variant of the same source', async () => {
      const value = html`
        <img src="https://ik.imagekit.io/acct/tr:w-300/https://origin.example.com/a/photo.jpg" data-enclosure="">
        <img src="https://ik.imagekit.io/acct/tr:w-900/https://origin.example.com/a/photo.jpg">
      `
      const expected = html`
        <img src="https://ik.imagekit.io/acct/tr:w-900/https://origin.example.com/a/photo.jpg">
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove a wsrv.nl variant of the same source', async () => {
      const value = html`
        <img src="https://wsrv.nl/?url=https%3A%2F%2Forigin.example.com%2Fa%2Fphoto.jpg&w=200" data-enclosure="">
        <img src="https://wsrv.nl/?url=https%3A%2F%2Forigin.example.com%2Fa%2Fphoto.jpg&w=800">
      `
      const expected = html`
        <img src="https://wsrv.nl/?url=https%3A%2F%2Forigin.example.com%2Fa%2Fphoto.jpg&w=800">
      `

      // The only case here needing `toEqualHtml`: linkedom writes the query separator as a bare
      // `&` where jsdom escapes it to `&amp;`.
      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep two proxied images with different inner sources across proxies', async () => {
      const value = html`
        <img src="https://i0.wp.com/example.com/a/one.png?w=300" data-enclosure="">
        <img src="https://i0.wp.com/example.com/a/two.png?w=300">
      `
      const expected = html`
        <img src="https://i0.wp.com/example.com/a/one.png?w=300">
        <img src="https://i0.wp.com/example.com/a/two.png?w=300">
      `

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
      const expected = html`
        <img src="https://example.com/small.jpg">
        <img src="https://example.com/large.jpg">
      `

      expect(await transform(value)).toEqualHtml(expected)
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
      <figure>
        <img src="https://example.com/photo.jpg" data-enclosure="">
      </figure>
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

  it('should be idempotent', async () => {
    const value = html`
      <img src="https://example.com/photo.jpg" data-enclosure="">
      <p>Content</p>
      <img src="https://example.com/photo.jpg">
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
