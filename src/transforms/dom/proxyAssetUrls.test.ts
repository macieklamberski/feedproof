import { expect, it } from 'bun:test'
import { baseContext as defaultContext, describeForEachParser, html } from '../../tests.js'
import type {
  AssetProxyFn,
  CiteResolverResult,
  EmbedResolverResult,
  TransformContext,
} from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { urlAttributes } from '../../utils/urls.js'
import {
  createCitePlaceholder,
  createEmbedPlaceholder,
  normalizeCiteFields,
  normalizeEmbedFields,
  prepareCiteMetadata,
  prepareEmbedMetadata,
} from '../../utils/widgets.js'
import { proxyAssetUrls } from './proxyAssetUrls.js'

const wrapProxy: AssetProxyFn = (url, type) => {
  return `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`
}

// proxyAssetUrls is idempotent only when assetProxyFn is: this one skips
// already-proxied URLs so re-running the transform is a no-op.
const idempotentProxy: AssetProxyFn = (url, type) => {
  if (url.startsWith('https://proxy.example.com/')) {
    return url
  }

  return wrapProxy(url, type)
}

// A consumer signing proxied URLs with Web Crypto has to return a promise, so the transform has
// to await whatever assetProxyFn hands back.
const asyncProxy: AssetProxyFn = async (url, type) => {
  await Promise.resolve()

  return wrapProxy(url, type)
}

const baseContext = (assetProxyFn?: AssetProxyFn): TransformContext => {
  return { ...defaultContext, assetProxyFn }
}

describeForEachParser('proxyAssetUrls', (parseHtml) => {
  const transform = (value: string, assetProxyFn?: AssetProxyFn) => {
    return applyDomTransforms(parseHtml(value), [proxyAssetUrls(baseContext(assetProxyFn))])
  }

  it('should be a no-op when assetProxyFn is unset', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'

    expect(await transform(value)).toEqualHtml(value)
  })

  // Every rewrite case below states the whole element, so each one also pins the contract that
  // the original url survives on the matching `data-proxied-*` attribute. That is why there are
  // no separate preservation cases: they were the same fixture asserted a second time.
  it('should rewrite img src as image', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const expected = html`
      <img
        src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
        data-proxied-src="https://cdn.example.com/photo.jpg"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite every entry in img srcset as image', async () => {
    const value = html`
      <img srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w">
    `
    const expected = html`
      <img
        srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fsmall.jpg 300w, https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flarge.jpg 600w"
        data-proxied-srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  // A url-less feed srcset leaves bare width descriptors the parser reads as urls. Proxying
  // one would sign and request a page that does not exist, so they are dropped first.
  it('should not proxy descriptor-only srcset candidates', async () => {
    const value = html`
      <img srcset="https://cdn.example.com/a.jpg 768w,  225w,  563w,  1152w">
    `
    const expected = html`
      <img
        srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fa.jpg 768w"
        data-proxied-srcset="https://cdn.example.com/a.jpg 768w,  225w,  563w,  1152w"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should normalize camelCase srcSet to lowercase srcset', async () => {
    const value = '<img srcSet="https://cdn.example.com/small.jpg 300w">'
    const expected = html`
      <img
        srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fsmall.jpg 300w"
        data-proxied-srcset="https://cdn.example.com/small.jpg 300w"
      >
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should leave srcset entries unchanged when assetProxyFn returns undefined for them', async () => {
    const passthrough: AssetProxyFn = (url) => {
      if (url.includes('keep')) {
        return
      }

      return `https://proxy.example.com/?url=${encodeURIComponent(url)}`
    }
    const value = html`
      <img srcset="https://cdn.example.com/keep.jpg 300w, https://cdn.example.com/proxy.jpg 600w">
    `
    const expected = html`
      <img
        srcset="https://cdn.example.com/keep.jpg 300w, https://proxy.example.com/?url=https%3A%2F%2Fcdn.example.com%2Fproxy.jpg 600w"
        data-proxied-srcset="https://cdn.example.com/keep.jpg 300w, https://cdn.example.com/proxy.jpg 600w"
      >
    `

    expect(await transform(value, passthrough)).toEqualHtml(expected)
  })

  it('should rewrite video src as video and poster as image', async () => {
    const value = html`
      <video
        src="https://cdn.example.com/clip.mp4"
        poster="https://cdn.example.com/thumb.jpg"
      >
      </video>
    `
    const expected = html`
      <video
        src="https://proxy.example.com/?type=video&url=https%3A%2F%2Fcdn.example.com%2Fclip.mp4"
        poster="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"
        data-proxied-src="https://cdn.example.com/clip.mp4"
        data-proxied-poster="https://cdn.example.com/thumb.jpg"
      >
      </video>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite audio src as audio', async () => {
    const value = '<audio src="https://cdn.example.com/clip.mp3"></audio>'
    const expected = html`
      <audio
        src="https://proxy.example.com/?type=audio&url=https%3A%2F%2Fcdn.example.com%2Fclip.mp3"
        data-proxied-src="https://cdn.example.com/clip.mp3"
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
          data-proxied-src="https://cdn.example.com/clip.mp4"
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
          data-proxied-src="https://cdn.example.com/clip.mp3"
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
          data-proxied-src="https://cdn.example.com/photo.jpg"
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
    const expected = html`
      <picture>
        <source
          srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.webp"
          data-proxied-srcset="https://cdn.example.com/photo.webp"
        >
        <img
          src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
          data-proxied-src="https://cdn.example.com/photo.jpg"
        >
      </picture>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-embed-thumbnail as image', async () => {
    const value = '<div data-embed-thumbnail="https://cdn.example.com/thumb.jpg"></div>'
    const expected = html`
      <div
        data-embed-thumbnail="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"
        data-proxied-embed-thumbnail="https://cdn.example.com/thumb.jpg"
      ></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-embed-avatar as image', async () => {
    const value = '<div data-embed-avatar="https://cdn.example.com/avatar.jpg"></div>'
    const expected = html`
      <div
        data-embed-avatar="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Favatar.jpg"
        data-proxied-embed-avatar="https://cdn.example.com/avatar.jpg"
      ></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-cite-icon as image', async () => {
    const value = '<div data-cite-icon="https://cdn.example.com/favicon.ico"></div>'
    const expected = html`
      <div
        data-cite-icon="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Ffavicon.ico"
        data-proxied-cite-icon="https://cdn.example.com/favicon.ico"
      ></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite data-cite-thumbnail as image', async () => {
    const value = '<div data-cite-thumbnail="https://cdn.example.com/thumb.jpg"></div>'
    const expected = html`
      <div
        data-cite-thumbnail="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fthumb.jpg"
        data-proxied-cite-thumbnail="https://cdn.example.com/thumb.jpg"
      ></div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should not rewrite data-cite-url (navigation, not asset)', async () => {
    const value = '<div data-cite-url="https://example.com/post"></div>'

    expect(await transform(value, wrapProxy)).toEqualHtml(value)
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
    const expected = html`
      <img src="data:image/png;base64,iVBORw0KGgo=">
      <img
        srcset="data:image/png;base64,abc 1x, https://proxy.example.com/?url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg 2x"
        data-proxied-srcset="data:image/png;base64,abc 1x, https://cdn.example.com/photo.jpg 2x"
      >
    `

    expect(await transform(value, recorder)).toEqualHtml(expected)
    expect(seen).toEqual(['https://cdn.example.com/photo.jpg'])
  })

  it('should rewrite SVG image href as image', async () => {
    const value = '<svg><image href="https://cdn.example.com/photo.jpg"/></svg>'
    const expected = html`
      <svg>
        <image
          href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
          data-proxied-href="https://cdn.example.com/photo.jpg"
        />
      </svg>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite SVG image xlink:href as image', async () => {
    const value = '<svg><image xlink:href="https://cdn.example.com/legacy.jpg"/></svg>'
    const expected = html`
      <svg>
        <image
          xlink:href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flegacy.jpg"
          data-proxied-xlink-href="https://cdn.example.com/legacy.jpg"
        />
      </svg>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src using parent media type', async () => {
    const value = html`
      <video>
        <track src="https://cdn.example.com/captions.vtt" kind="subtitles">
      </video>
    `
    const expected = html`
      <video>
        <track
          src="https://proxy.example.com/?type=video&url=https%3A%2F%2Fcdn.example.com%2Fcaptions.vtt"
          data-proxied-src="https://cdn.example.com/captions.vtt"
          kind="subtitles"
        >
      </video>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src inside audio as audio', async () => {
    const value = html`
      <audio>
        <track src="https://cdn.example.com/chapters.vtt" kind="chapters">
      </audio>
    `
    const expected = html`
      <audio>
        <track
          src="https://proxy.example.com/?type=audio&url=https%3A%2F%2Fcdn.example.com%2Fchapters.vtt"
          data-proxied-src="https://cdn.example.com/chapters.vtt"
          kind="chapters"
        >
      </audio>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should rewrite track src outside video and audio as image', async () => {
    const value = '<div><track src="https://cdn.example.com/captions.vtt" kind="subtitles"></div>'
    const expected = html`
      <div>
        <track
          src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fcaptions.vtt"
          data-proxied-src="https://cdn.example.com/captions.vtt"
          kind="subtitles"
        >
      </div>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should proxy uppercase attribute names via parseHtml normalization', async () => {
    const value = '<IMG SRC="https://cdn.example.com/photo.jpg">'
    const expected = html`
      <img
        src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
        data-proxied-src="https://cdn.example.com/photo.jpg"
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

  it('should preserve original SVG image href and xlink:href', async () => {
    const value = html`
      <svg>
        <image href="https://cdn.example.com/photo.jpg" />
        <image xlink:href="https://cdn.example.com/legacy.jpg" />
      </svg>
    `
    const expected = html`
      <svg>
        <image
          href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
          data-proxied-href="https://cdn.example.com/photo.jpg"
        />
        <image
          xlink:href="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flegacy.jpg"
          data-proxied-xlink-href="https://cdn.example.com/legacy.jpg"
        />
      </svg>
    `

    expect(await transform(value, wrapProxy)).toEqualHtml(expected)
  })

  it('should not add a preserved attribute for data: URIs', async () => {
    const value = '<img src="data:image/png;base64,iVBORw0KGgo=">'

    expect(await transform(value, wrapProxy)).toEqualHtml(value)
  })

  it('should be idempotent given an idempotent assetProxyFn', async () => {
    const value = '<img src="https://cdn.example.com/photo.jpg">'
    const once = await transform(value, idempotentProxy)
    const twice = await transform(once, idempotentProxy)

    expect(twice).toEqualHtml(once)
  })

  it('should await an async assetProxyFn on a src attribute', async () => {
    const value = html`<img src="https://cdn.example.com/photo.jpg">`
    const expected = html`
      <img
        src="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
        data-proxied-src="https://cdn.example.com/photo.jpg"
      >
    `

    expect(await transform(value, asyncProxy)).toEqualHtml(expected)
  })

  it('should await an async assetProxyFn on every srcset entry', async () => {
    const value = html`
      <img srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w">
    `
    const expected = html`
      <img
        srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fsmall.jpg 300w, https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flarge.jpg 600w"
        data-proxied-srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w"
      >
    `

    expect(await transform(value, asyncProxy)).toEqualHtml(expected)
  })

  it('should not overwrite the preserved src on a second idempotent run', async () => {
    const value = html`
      <img srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w">
    `
    const expected = html`
      <img
        srcset="https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Fsmall.jpg 300w, https://proxy.example.com/?type=image&url=https%3A%2F%2Fcdn.example.com%2Flarge.jpg 600w"
        data-proxied-srcset="https://cdn.example.com/small.jpg 300w, https://cdn.example.com/large.jpg 600w"
      >
    `
    const once = await transform(value, idempotentProxy)
    const twice = await transform(once, idempotentProxy)

    expect(twice).toEqualHtml(expected)
  })
  // A url a placeholder mints is an asset or it is not, and the `asset` column of urlAttributes is
  // the only place that says which: `data-embed-src` is a media url and is right to stay
  // unproxied, being the player a reader frames, while the `data-embed-thumbnail` beside it is a
  // file the proxy serves. So the table is the ground truth for the classification, and what the
  // next two check is the pass against it. A url field added to utils/widgets.ts and never
  // classified is caught: the pass leaves it alone and the table declares nothing about it, so it
  // shows up as a url neither proxied nor accounted for.
  //
  // Every field is handed the same non-url marker and the context resolver answers with the asset
  // url, so whatever the placeholder ends up carrying is exactly what the mint path treats as a
  // url.
  const assetUrl = 'https://cdn.example.com/asset.jpg'
  const mintContext: TransformContext = {
    ...defaultContext,
    resolveUrlFn: () => assetUrl,
    assetProxyFn: wrapProxy,
  }
  // Attributes the table declares carry a url but no asset, so the pass is right to skip them.
  const unproxyableAttributes = urlAttributes
    .filter(({ tag, asset }) => !tag && !asset)
    .map(({ attribute }) => attribute)

  // Stands in for a result with every field populated. The point is to fill each field the mint
  // path knows, not to be a valid result, so the declared field types are asserted away.
  const markerFields = <Type>(names: Array<string>): Type => {
    return Object.fromEntries(names.map((name) => [name, 'not-a-url'])) as unknown as Type
  }

  // Read against the names the placeholder was minted with, since a proxied attribute leaves its
  // original url behind on a `data-proxied-*` companion, which would otherwise read as unproxied.
  const unproxied = async (document: Document, placeholder: Element): Promise<Array<string>> => {
    const names = placeholder.getAttributeNames()

    document.body.appendChild(placeholder)
    await proxyAssetUrls(mintContext)(document)

    return names.filter((name) => placeholder.getAttribute(name) === assetUrl)
  }

  it('should proxy every asset url an embed placeholder can mint', async () => {
    const document = parseHtml('')
    const metadata = markerFields<EmbedResolverResult>(Object.keys(normalizeEmbedFields({})))
    const placeholder = createEmbedPlaceholder(
      document,
      prepareEmbedMetadata(metadata, mintContext) as EmbedResolverResult,
    )
    const expected = placeholder
      .getAttributeNames()
      .filter((name) => unproxyableAttributes.includes(name))

    expect(await unproxied(document, placeholder)).toEqual(expected)
  })

  it('should proxy every asset url a cite placeholder can mint', async () => {
    const document = parseHtml('')
    const metadata = markerFields<CiteResolverResult>(Object.keys(normalizeCiteFields({})))
    const placeholder = createCitePlaceholder(
      document,
      prepareCiteMetadata(metadata, mintContext) as CiteResolverResult,
    )
    const expected = placeholder
      .getAttributeNames()
      .filter((name) => unproxyableAttributes.includes(name))

    expect(await unproxied(document, placeholder)).toEqual(expected)
  })
})
