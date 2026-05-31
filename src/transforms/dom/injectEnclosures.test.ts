import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { youtubeEmbedResolver } from '../../embeds/youtube.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { Enclosure, TransformContext } from '../../types.js'
import { injectEnclosures } from './injectEnclosures.js'

const withResolver: TransformContext = {
  ...baseContext,
  embedResolvers: [youtubeEmbedResolver],
}

const withEnclosures = (enclosures: Array<Enclosure>): TransformContext => {
  return { ...withResolver, enclosures }
}

describeForEachParser('injectEnclosures', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [injectEnclosures(context)])
  }

  it('should inject video enclosure as native video element', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )

    expect(result).toContain('<video')
    expect(result).toContain('src="https://example.com/clip.mp4"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
  })

  it('should inject enclosure before existing content', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]),
    )
    const embedIndex = result.indexOf('<audio')
    const contentIndex = result.indexOf('Episode notes')

    expect(embedIndex).toBeLessThan(contentIndex)
  })

  it('should inject audio enclosure as native audio element', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }]),
    )

    expect(result).toContain('<audio')
    expect(result).toContain('src="https://example.com/episode.mp3"')
    expect(result).toContain(' controls')
    expect(result).toContain('preload="none"')
  })

  it('should resolve video enclosure through embedResolver', async () => {
    const value = '<p>Episode notes</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' }]),
    )

    expect(result).toContain('data-embed-provider="youtube"')
    expect(result).toContain('data-embed-thumbnail=')
  })

  it('should skip enclosures already present in content', async () => {
    const value = '<p>Content</p><video src="https://example.com/clip.mp4"></video>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )
    const matches = result.match(/example\.com\/clip\.mp4/g)

    expect(matches).toHaveLength(1)
  })

  it('should skip image enclosures', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/photo.jpg', type: 'image/jpeg' }]),
    )

    expect(result).not.toContain('data-embed')
  })

  it('should skip enclosures without type or medium', async () => {
    const value = '<p>Content</p>'
    const result = await transform(value, withEnclosures([{ url: 'https://example.com/file.bin' }]))

    expect(result).not.toContain('data-embed')
  })

  it('should inject multiple enclosures', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://example.com/episode.mp3', type: 'audio/mpeg' },
        { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
      ]),
    )

    expect(result).toContain('<audio')
    expect(result).toContain('<video')
  })

  it('should detect audio by medium field', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/episode.mp3', medium: 'audio' }]),
    )

    expect(result).toContain('<audio')
  })

  it('should detect video by medium field', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', medium: 'video' }]),
    )

    expect(result).toContain('<video')
  })

  it('should do nothing when no enclosures', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value)).not.toContain('data-embed')
  })

  it('should do nothing when enclosures is empty', async () => {
    const value = '<p>Content</p>'

    expect(await transform(value, withEnclosures([]))).not.toContain('data-embed')
  })

  it('should resolve enclosure with unrecognized type through resolver', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://www.youtube.com/v/dQw4w9WgXcQ', type: 'application/x-shockwave-flash' },
      ]),
    )

    expect(result).toContain('data-embed-src=')
    expect(result).toContain('data-embed-provider="youtube"')
  })

  it('should use resolver type over enclosure medium', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', medium: 'video' }]),
    )

    expect(result).toContain('data-embed-src=')
  })

  it('should skip enclosure with unrecognized type and no resolver match', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://example.com/widget.swf', type: 'application/x-shockwave-flash' },
      ]),
    )

    expect(result).not.toContain('data-embed')
  })

  it('should skip enclosure with javascript: url', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'javascript:alert(1)', medium: 'video' }]),
    )

    expect(result).not.toContain('data-embed')
    expect(result).not.toContain('javascript:')
  })

  it('should skip enclosure with data: url', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'data:text/html,<script>1</script>', medium: 'video' }]),
    )

    expect(result).not.toContain('data-embed')
  })

  it('should emit width and height on video enclosure when provided', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        { url: 'https://example.com/clip.mp4', type: 'video/mp4', width: 1280, height: 720 },
      ]),
    )

    expect(result).toContain('width="1280"')
    expect(result).toContain('height="720"')
  })

  it('should emit poster on video enclosure from first thumbnail', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        {
          url: 'https://example.com/clip.mp4',
          type: 'video/mp4',
          thumbnails: [
            { url: 'https://example.com/poster-large.jpg', width: 1280, height: 720 },
            { url: 'https://example.com/poster-small.jpg' },
          ],
        },
      ]),
    )

    expect(result).toContain('poster="https://example.com/poster-large.jpg"')
  })

  it('should skip unsafe poster url', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        {
          url: 'https://example.com/clip.mp4',
          type: 'video/mp4',
          thumbnails: [{ url: 'javascript:alert(1)' }],
        },
      ]),
    )

    expect(result).not.toContain('poster=')
    expect(result).not.toContain('javascript:')
  })

  it('should not emit width, height, or poster on audio enclosure', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([
        {
          url: 'https://example.com/episode.mp3',
          type: 'audio/mpeg',
          width: 1280,
          height: 720,
          thumbnails: [{ url: 'https://example.com/cover.jpg' }],
        },
      ]),
    )

    expect(result).toContain('<audio')
    expect(result).not.toContain('width=')
    expect(result).not.toContain('height=')
    expect(result).not.toContain('poster=')
  })

  it('should not emit width or height on video enclosure when missing', async () => {
    const value = '<p>Content</p>'
    const result = await transform(
      value,
      withEnclosures([{ url: 'https://example.com/clip.mp4', type: 'video/mp4' }]),
    )

    expect(result).toContain('<video')
    expect(result).not.toContain('width=')
    expect(result).not.toContain('height=')
    expect(result).not.toContain('poster=')
  })

  it('should be idempotent', async () => {
    const value = '<p>Episode notes</p>'
    const enclosures: Array<Enclosure> = [
      { url: 'https://example.com/clip.mp4', type: 'video/mp4' },
    ]
    const once = await transform(value, withEnclosures(enclosures))
    const twice = await transform(once, withEnclosures(enclosures))

    expect(twice).toBe(once)
  })
})
