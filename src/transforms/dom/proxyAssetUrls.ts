import { parseSrcset, stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'

const sourceTypeFromParent = (element: Element): AssetType => {
  const parent = element.parentElement?.tagName

  if (parent === 'VIDEO') {
    return 'video'
  }

  if (parent === 'AUDIO') {
    return 'audio'
  }

  return 'image'
}

const isProxyableUrl = (url: string): boolean => {
  return !url.startsWith('data:')
}

const proxyAttribute = (
  element: Element,
  attribute: string,
  type: AssetType,
  assetProxyFn: AssetProxyFn,
): void => {
  const value = element.getAttribute(attribute)

  if (!value || !isProxyableUrl(value)) {
    return
  }

  const proxied = assetProxyFn(value, type)

  if (proxied) {
    element.setAttribute(attribute, proxied)
  }
}

const proxySrcset = (element: Element, type: AssetType, assetProxyFn: AssetProxyFn): void => {
  const srcset = element.getAttribute('srcset')

  if (!srcset) {
    return
  }

  const rewritten = parseSrcset(srcset).map((entry) => {
    if (!isProxyableUrl(entry.url)) {
      return entry
    }

    return {
      ...entry,
      url: assetProxyFn(entry.url, type) ?? entry.url,
    }
  })

  element.setAttribute('srcset', stringifySrcset(rewritten))
}

export const proxyAssetUrls: DomTransform = ({ assetProxyFn }) => {
  return (document) => {
    if (!assetProxyFn) {
      return
    }

    for (const image of document.querySelectorAll('img')) {
      proxyAttribute(image, 'src', 'image', assetProxyFn)
      proxySrcset(image, 'image', assetProxyFn)
    }

    for (const video of document.querySelectorAll('video')) {
      proxyAttribute(video, 'src', 'video', assetProxyFn)
      proxyAttribute(video, 'poster', 'image', assetProxyFn)
    }

    for (const audio of document.querySelectorAll('audio')) {
      proxyAttribute(audio, 'src', 'audio', assetProxyFn)
    }

    for (const source of document.querySelectorAll('source')) {
      const type = sourceTypeFromParent(source)
      proxyAttribute(source, 'src', type, assetProxyFn)
      proxySrcset(source, 'image', assetProxyFn)
    }

    for (const track of document.querySelectorAll('track')) {
      proxyAttribute(track, 'src', sourceTypeFromParent(track), assetProxyFn)
    }

    // SVG2 uses `href`; legacy SVG1 uses `xlink:href`. linkedom preserves either.
    for (const image of document.querySelectorAll('image')) {
      const attribute = image.hasAttribute('href') ? 'href' : 'xlink:href'
      proxyAttribute(image, attribute, 'image', assetProxyFn)
    }

    for (const element of document.querySelectorAll('[data-embed-thumbnail]')) {
      proxyAttribute(element, 'data-embed-thumbnail', 'image', assetProxyFn)
    }

    for (const element of document.querySelectorAll('[data-embed-avatar]')) {
      proxyAttribute(element, 'data-embed-avatar', 'image', assetProxyFn)
    }
  }
}
