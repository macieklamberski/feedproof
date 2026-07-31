import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { MediaResolver, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertMediaContainers } from './convertMediaContainers.js'

const videoId = 'de58e4a3-5505-45a7-8abc-b46c5c0f6e7a'
const videoSrc = `https://api.substack.com/api/v1/video/upload/${videoId}/src`

describeForEachParser('convertMediaContainers', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertMediaContainers(context)])
  }

  const withResolver = (resolver: MediaResolver): TransformContext => {
    return { ...baseContext, mediaResolvers: [resolver] }
  }

  // The two parsers order attributes differently and serialize `controls` with and without
  // a value, so each piece is asserted on its own rather than as one rendered tag.
  it('should replace a container with a video element carrying controls', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>`
    const result = await transform(value)

    expect(result).toContain('<video')
    expect(result).toContain(`src="${videoSrc}"`)
    expect(result).toContain('controls')
    expect(result).not.toContain('native-video-embed')
  })

  it('should replace an audio container with an audio element', async () => {
    const value = `<div class="native-audio-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>`
    const result = await transform(value)

    expect(result).toContain('<audio')
    expect(result).not.toContain('<video')
  })

  it('should leave a container its resolver rejects', async () => {
    const value = '<div class="native-video-embed"></div>'
    const result = await transform(value)

    expect(result).toContain('native-video-embed')
    expect(result).not.toContain('<video')
  })

  it('should leave surrounding content untouched', async () => {
    const value = html`
      <p>Before.</p>
      <div class="native-video-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>
      <p>After.</p>
    `
    const result = await transform(value)

    expect(result).toContain('<p>Before.</p>')
    expect(result).toContain('<p>After.</p>')
  })

  it('should run every resolver in the array', async () => {
    const otherResolver: MediaResolver = {
      selector: '.other-embed',
      extract: () => ({ tag: 'audio', src: 'https://example.com/track.mp3' }),
    }
    const context: TransformContext = {
      ...baseContext,
      mediaResolvers: [...baseContext.mediaResolvers, otherResolver],
    }
    const value = html`
      <div class="native-video-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>
      <div class="other-embed"></div>
    `
    const result = await transform(value, context)

    expect(result).toContain(videoSrc)
    expect(result).toContain('https://example.com/track.mp3')
  })

  it('should write a poster onto a video', async () => {
    const posterResolver: MediaResolver = {
      selector: '.poster-embed',
      extract: () => ({
        tag: 'video',
        src: 'https://example.com/clip.mp4',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const result = await transform(value, withResolver(posterResolver))

    expect(result).toContain('poster="https://example.com/still.jpg"')
  })

  it('should not write a poster onto an audio element', async () => {
    const posterResolver: MediaResolver = {
      selector: '.poster-embed',
      extract: () => ({
        tag: 'audio',
        src: 'https://example.com/track.mp3',
        poster: 'https://example.com/still.jpg',
      }),
    }
    const value = '<div class="poster-embed"></div>'
    const result = await transform(value, withResolver(posterResolver))

    expect(result).toContain('<audio')
    expect(result).not.toContain('poster')
  })

  it('should await an async resolver', async () => {
    const asyncResolver: MediaResolver = {
      selector: '.async-embed',
      extract: async () => ({ tag: 'video', src: 'https://example.com/clip.mp4' }),
    }
    const value = '<div class="async-embed"></div>'
    const result = await transform(value, withResolver(asyncResolver))

    expect(result).toContain('<video')
    expect(result).toContain('https://example.com/clip.mp4')
  })

  it('should do nothing when no resolvers are configured', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>`
    const result = await transform(value, { ...baseContext, mediaResolvers: [] })

    expect(result).toContain('native-video-embed')
    expect(result).not.toContain('<video')
  })

  it('should be idempotent', async () => {
    const value = `<div class="native-video-embed" data-attrs='{"mediaUploadId":"${videoId}"}'></div>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
