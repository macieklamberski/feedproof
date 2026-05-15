import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { AssetProxyFn, TransformContext } from '../../types.js'
import { proxyAssetUrls } from './proxyAssetUrls.js'

const wrapProxy: AssetProxyFn = (url, type) => {
  return `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`
}

const baseContext = (assetProxyFn?: AssetProxyFn): TransformContext => {
  return {
    embedResolvers: defaultEmbedResolvers,
    lazySrcAttributes: defaultLazySrcAttributes,
    trackingHosts: defaultTrackingHosts,
    trackingPathSegments: defaultTrackingPathSegments,
    urlUnwrappers: defaultUrlUnwrappers,
    resolveUrlFn: defaultResolveUrlFn,
    assetProxyFn,
  }
}

describe('proxyAssetUrls', () => {
  const transform = (html: string, assetProxyFn?: AssetProxyFn) => {
    return transformHtml(html, proxyAssetUrls(baseContext(assetProxyFn)))
  }

  it('should be a no-op when assetProxyFn is unset', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const result = await transform(value)

    expect(result).toBe(value)
  })

  it('should rewrite img src as image', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const result = await transform(value, wrapProxy)

    expect(result).toContain(
      'src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"',
    )
  })

  it('should rewrite every entry in img srcset as image', async () => {
    const value =
      '<img srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w">'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('type=image')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fsmall.jpg')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Flarge.jpg')
  })

  it('should normalize camelCase srcSet to lowercase srcset', async () => {
    const value = '<img srcSet="https://cdn.example.com/small.jpg 300w">'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('srcset="')
    expect(result).not.toContain('srcSet=')
  })

  it('should leave srcset entries unchanged when assetProxyFn returns undefined for them', async () => {
    const passthrough: AssetProxyFn = (url) => {
      if (url.includes('keep')) {
        return
      }

      return `https://proxy.example.com/?url=${encodeURIComponent(url)}`
    }
    const value =
      '<img srcset="https://cdn.example.com/keep.jpg 300w, https://cdn.example.com/proxy.jpg 600w">'
    const result = await transform(value, passthrough)

    expect(result).toContain('https://cdn.example.com/keep.jpg 300w')
    expect(result).toContain(
      `https://proxy.example.com/?url=${encodeURIComponent('https://cdn.example.com/proxy.jpg')} 600w`,
    )
  })

  it('should rewrite video src as video and poster as image', async () => {
    const value =
      '<video src="https://cdn.example.com/clip.mp4" poster="https://cdn.example.com/thumb.jpg"></video>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('src="https://proxy.example.com/?type=video&url=')
    expect(result).toContain('poster="https://proxy.example.com/?type=image&url=')
  })

  it('should rewrite audio src as audio', async () => {
    const value = '<audio src="https://cdn.example.com/clip.mp3"></audio>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('src="https://proxy.example.com/?type=audio&url=')
  })

  it('should rewrite source inside video as video', async () => {
    const value = '<video><source src="https://cdn.example.com/clip.mp4"></video>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('src="https://proxy.example.com/?type=video&url=')
  })

  it('should rewrite source inside audio as audio', async () => {
    const value = '<audio><source src="https://cdn.example.com/clip.mp3"></audio>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('src="https://proxy.example.com/?type=audio&url=')
  })

  it('should rewrite source inside picture as image', async () => {
    const value =
      '<picture><source srcset="https://cdn.example.com/photo.webp"><img src="https://cdn.example.com/photo.jpg"></picture>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('type=image')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.webp')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.jpg')
  })

  it('should rewrite data-embed-thumbnail as image', async () => {
    const value =
      '<div data-embed="iframe" data-embed-thumbnail="https://cdn.example.com/thumb.jpg"></div>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain(
      'data-embed-thumbnail="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"',
    )
  })

  it('should rewrite data-embed-avatar as image', async () => {
    const value =
      '<div data-embed="iframe" data-embed-avatar="https://cdn.example.com/avatar.jpg"></div>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain(
      'data-embed-avatar="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Favatar.jpg"',
    )
  })

  it('should leave attributes unchanged when assetProxyFn returns undefined', async () => {
    const skip: AssetProxyFn = () => undefined
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const result = await transform(value, skip)

    expect(result).toContain('src="https://cdn.example.com/photo.jpg"')
  })

  it('should leave data: URIs untouched and never invoke assetProxyFn for them', async () => {
    const seen: Array<string> = []
    const recorder: AssetProxyFn = (url) => {
      seen.push(url)
      return `https://proxy.example.com/?url=${encodeURIComponent(url)}`
    }
    const value =
      '<img src="data:image/png;base64,iVBORw0KGgo="><img srcset="data:image/png;base64,abc 1x, https://cdn.example.com/photo.jpg 2x">'
    const result = await transform(value, recorder)

    expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo="')
    expect(result).toContain('data:image/png;base64,abc 1x')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.jpg')
    expect(seen).toEqual(['https://cdn.example.com/photo.jpg'])
  })

  it('should proxy uppercase attribute names via parseFragment normalization', async () => {
    const value = '<IMG SRC="https://cdn.example.com/photo.jpg">'
    const result = await transform(value, wrapProxy)

    expect(result).toContain(
      'src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"',
    )
  })

  it('should pass the correct type for each asset kind', async () => {
    const seen: Array<string> = []
    const recorder: AssetProxyFn = (_, type) => {
      seen.push(type)
      return
    }

    const value = `
      <img src="https://cdn.example.com/photo.jpg">
      <video src="https://cdn.example.com/clip.mp4" poster="https://cdn.example.com/thumb.jpg"></video>
      <audio src="https://cdn.example.com/clip.mp3"></audio>
    `
    await transform(value, recorder)

    expect(seen).toEqual(['image', 'video', 'image', 'audio'])
  })
})
