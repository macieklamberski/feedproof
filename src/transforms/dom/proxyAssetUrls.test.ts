import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext as defaultContext, describeForEachParser, html } from '../../tests.js'
import type { AssetProxyFn, TransformContext } from '../../types.js'
import { proxyAssetUrls } from './proxyAssetUrls.js'

const wrapProxy: AssetProxyFn = (url, type) => {
  return `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`
}

// proxyAssetUrls is idempotent only when assetProxyFn is — this one skips
// already-proxied URLs so re-running the transform is a no-op.
const idempotentProxy: AssetProxyFn = (url, type) => {
  if (url.startsWith('https://proxy.example.com/')) {
    return url
  }

  return wrapProxy(url, type)
}

const baseContext = (assetProxyFn?: AssetProxyFn): TransformContext => {
  return { ...defaultContext, assetProxyFn }
}

describeForEachParser('proxyAssetUrls', (parseHtml) => {
  const transform = (html: string, assetProxyFn?: AssetProxyFn) => {
    return applyDomTransforms(parseHtml(html), [proxyAssetUrls(baseContext(assetProxyFn))])
  }

  it('should be a no-op when assetProxyFn is unset', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'

    expect(await transform(value)).toBe(value)
  })

  it('should rewrite img src as image', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const expected = html`
      <img
        src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite every entry in img srcset as image', async () => {
    const value = html`
      <img srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w">
    `
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
    const value = html`
      <video
        src="https://cdn.example.com/clip.mp4"
        poster="https://cdn.example.com/thumb.jpg"
      >
      </video>
    `
    const result = await transform(value, wrapProxy)

    expect(result).toContainHtml('src="https://proxy.example.com/?type=video&url=')
    expect(result).toContainHtml('poster="https://proxy.example.com/?type=image&url=')
  })

  it('should rewrite audio src as audio', async () => {
    const value = '<audio src="https://cdn.example.com/clip.mp3"></audio>'
    const expected = html`
      <audio
        src="https://proxy.example.com/?type=audio&url=https%3A%2F%2Fcdn.example.com%2Fclip.mp3"
      >
      </audio>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite source inside video as video', async () => {
    const value = '<video><source src="https://cdn.example.com/clip.mp4"></video>'
    const expected = html`
      <video>
        <source
          src="https://proxy.example.com/?type=video&url=https%3A%2F%2Fcdn.example.com%2Fclip.mp4"
        >
      </video>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite source inside audio as audio', async () => {
    const value = '<audio><source src="https://cdn.example.com/clip.mp3"></audio>'
    const expected = html`
      <audio>
        <source
          src="https://proxy.example.com/?type=audio&url=https%3A%2F%2Fcdn.example.com%2Fclip.mp3"
        >
      </audio>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite source outside video and audio as image', async () => {
    const value = '<div><source src="https://cdn.example.com/photo.jpg"></div>'
    const expected = html`
      <div>
        <source
          src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
        >
      </div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite source inside picture as image', async () => {
    const value = html`
      <picture>
        <source srcset="https://cdn.example.com/photo.webp">
        <img src="https://cdn.example.com/photo.jpg">
      </picture>
    `
    const result = await transform(value, wrapProxy)

    expect(result).toContain('type=image')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.webp')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.jpg')
  })

  it('should rewrite data-embed-thumbnail as image', async () => {
    const value = '<div data-embed-thumbnail="https://cdn.example.com/thumb.jpg"></div>'
    const expected = html`
      <div data-embed-thumbnail="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-embed-avatar as image', async () => {
    const value = '<div data-embed-avatar="https://cdn.example.com/avatar.jpg"></div>'
    const expected = html`
      <div data-embed-avatar="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Favatar.jpg"></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-bookmark-icon as image', async () => {
    const value = '<div data-bookmark-icon="https://cdn.example.com/favicon.ico"></div>'
    const expected = html`
      <div data-bookmark-icon="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Ffavicon.ico"></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-bookmark-thumbnail as image', async () => {
    const value = '<div data-bookmark-thumbnail="https://cdn.example.com/thumb.jpg"></div>'
    const expected = html`
      <div data-bookmark-thumbnail="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should not rewrite data-bookmark-url (navigation, not asset)', async () => {
    const value = '<div data-bookmark-url="https://example.com/post"></div>'
    const result = await transform(value, wrapProxy)

    expect(result).toContain('data-bookmark-url="https://example.com/post"')
    expect(result).not.toContain('proxy.example.com')
  })

  it('should leave attributes unchanged when assetProxyFn returns undefined', async () => {
    const skip: AssetProxyFn = () => undefined
    const value = '<img src="https://cdn.example.com/photo.jpg">'

    expect(await transform(value, skip)).toEqualHtml(value)
  })

  it('should leave data: URIs untouched and never invoke assetProxyFn for them', async () => {
    const seen: Array<string> = []
    const recorder: AssetProxyFn = (url) => {
      seen.push(url)
      return `https://proxy.example.com/?url=${encodeURIComponent(url)}`
    }
    const value = html`
      <img src="data:image/png;base64,iVBORw0KGgo=">
      <img srcset="data:image/png;base64,abc 1x, https://cdn.example.com/photo.jpg 2x">
    `
    const result = await transform(value, recorder)

    expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo="')
    expect(result).toContain('data:image/png;base64,abc 1x')
    expect(result).toContain('https%3A%2F%2Fcdn.example.com%2Fphoto.jpg')
    expect(seen).toEqual(['https://cdn.example.com/photo.jpg'])
  })

  it('should rewrite SVG image href as image', async () => {
    const value = '<svg><image href="https://cdn.example.com/photo.jpg"/></svg>'
    const expected = html`
      <svg>
        <image
          href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
        />
      </svg>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite SVG image xlink:href as image', async () => {
    const value = '<svg><image xlink:href="https://cdn.example.com/legacy.jpg"/></svg>'
    const expected = html`
      <svg>
        <image xlink:href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flegacy.jpg" />
      </svg>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src using parent media type', async () => {
    const value =
      '<video><track src="https://cdn.example.com/captions.vtt" kind="subtitles"></video>'
    const expected = html`
      <video>
        <track src="https://proxy.example.com/?type=video&url=https%3A%2F%2Fcdn.example.com%2Fcaptions.vtt" kind="subtitles">
      </video>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src inside audio as audio', async () => {
    const value =
      '<audio><track src="https://cdn.example.com/chapters.vtt" kind="chapters"></audio>'
    const expected = html`
      <audio>
        <track src="https://proxy.example.com/?type=audio&url=https%3A%2F%2Fcdn.example.com%2Fchapters.vtt" kind="chapters">
      </audio>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src outside video and audio as image', async () => {
    const value = '<div><track src="https://cdn.example.com/captions.vtt" kind="subtitles"></div>'
    const expected = html`
      <div>
        <track src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fcaptions.vtt" kind="subtitles">
      </div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should proxy uppercase attribute names via parseHtml normalization', async () => {
    const value = '<IMG SRC="https://cdn.example.com/photo.jpg">'
    const expected = html`
      <img
        src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should pass the correct type for each asset kind', async () => {
    const seen: Array<string> = []
    const recorder: AssetProxyFn = (_, type) => {
      seen.push(type)
    }

    const value = html`
      <img src="https://cdn.example.com/photo.jpg">
      <video
        src="https://cdn.example.com/clip.mp4"
        poster="https://cdn.example.com/thumb.jpg"
      >
      </video>
      <audio src="https://cdn.example.com/clip.mp3"></audio>
    `
    await transform(value, recorder)

    expect(seen).toEqual(['image', 'video', 'image', 'audio'])
  })

  it('should be idempotent given an idempotent assetProxyFn', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const once = await transform(value, idempotentProxy)
    const twice = await transform(once, idempotentProxy)

    expect(twice).toBe(once)
  })
})
