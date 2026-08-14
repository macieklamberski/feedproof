import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { linkifyFlickrEmbeds } from './linkifyFlickrEmbeds.js'

describeForEachParser('linkifyFlickrEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [linkifyFlickrEmbeds(baseContext)])
  }

  it('should replace the object and embed pair with one link to the album', async () => {
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
    const result = await transform(value)

    expect(result).toContain(
      '<a href="https://www.flickr.com/photos/12345678@N00/sets/72157624341">https://www.flickr.com/photos/12345678@N00/sets/72157624341</a>',
    )
    expect(result).not.toContain('<object')
    expect(result).not.toContain('<embed')
  })

  it('should read the config off an embed that carries it itself', async () => {
    const value = html`
      <embed
        type="application/x-shockwave-flash"
        src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
        flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
      />
    `
    const result = await transform(value)

    expect(result).toContain('href="https://www.flickr.com/photos/bees/sets/72157624341"')
  })

  it('should leave a carrier whose config names no set', async () => {
    const value = html`
      <embed
        src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
        flashvars="offsite=true&amp;lang=en-us"
      />
    `
    const result = await transform(value)

    expect(result).not.toContain('<a href')
    expect(result).toContain('<embed')
  })

  it('should leave a carrier with no config at all', async () => {
    const value = html`
      <embed src="https://www.flickr.com/apps/slideshow/show.swf?v=143567" />
    `
    const result = await transform(value)

    expect(result).not.toContain('<a href')
  })

  it('should leave a flickr app that is not the slideshow', async () => {
    const value = html`
      <embed
        src="https://www.flickr.com/apps/video/stewart.swf"
        flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
      />
    `
    const result = await transform(value)

    expect(result).not.toContain('<a href')
  })

  it('should leave a set path whose owner is not url-safe', async () => {
    const value = html`
      <embed
        src="https://www.flickr.com/apps/slideshow/show.swf"
        flashvars="page_show_url=%2Fphotos%2F..%2F..%2Fsets%2F72157624341%2Fshow%2F"
      />
    `
    const result = await transform(value)

    expect(result).not.toContain('<a href')
  })

  it('should leave a carrier on another host', async () => {
    const value = html`
      <embed
        src="https://evil.test/flickr.com/apps/slideshow/show.swf"
        flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
      />
    `
    const result = await transform(value)

    expect(result).not.toContain('<a href')
  })

  it('should be idempotent', async () => {
    const value = html`
      <embed
        src="https://www.flickr.com/apps/slideshow/show.swf?v=143567"
        flashvars="page_show_url=%2Fphotos%2Fbees%2Fsets%2F72157624341%2Fshow%2F"
      />
    `
    const once = await transform(value)
    const twice = await applyDomTransforms(parseHtml(once), [linkifyFlickrEmbeds(baseContext)])

    expect(twice).toBe(once)
  })
})
