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

const proxyAttribute = (
  element: Element,
  attribute: string,
  type: AssetType,
  assetProxyFn: AssetProxyFn,
): void => {
  const value = element.getAttribute(attribute)

  if (!value) {
    return
  }

  const proxied = assetProxyFn(value, type)

  if (proxied) {
    element.setAttribute(attribute, proxied)
  }
}

const proxySrcset = (element: Element, type: AssetType, assetProxyFn: AssetProxyFn): void => {
  // React/Next.js SSR renders camelCase srcSet instead of lowercase srcset
  // (https://github.com/facebook/react/issues/19799). Linkedom treats attributes as case-sensitive
  // (https://github.com/WebReflection/linkedom/issues/235), so we read both casings.
  const srcset = element.getAttribute('srcset') ?? element.getAttribute('srcSet')

  if (!srcset) {
    return
  }

  const rewritten = parseSrcset(srcset).map((entry) => ({
    ...entry,
    url: assetProxyFn(entry.url, type) ?? entry.url,
  }))

  element.removeAttribute('srcSet')
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

    for (const element of document.querySelectorAll('[data-embed-thumbnail]')) {
      proxyAttribute(element, 'data-embed-thumbnail', 'image', assetProxyFn)
    }

    for (const element of document.querySelectorAll('[data-embed-avatar]')) {
      proxyAttribute(element, 'data-embed-avatar', 'image', assetProxyFn)
    }
  }
}
