import { parseSrcset, stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'

const proxyableSelectors = [
  'img',
  'video',
  'audio',
  'source',
  'track',
  'image',
  '[data-embed-thumbnail]',
  '[data-embed-avatar]',
  '[data-bookmark-icon]',
  '[data-bookmark-thumbnail]',
]

const sourceTypeFromParent = (element: Element): AssetType => {
  const parent = element.parentElement?.localName

  if (parent === 'video') {
    return 'video'
  }

  if (parent === 'audio') {
    return 'audio'
  }

  return 'image'
}

const isProxyableUrl = (url: string): boolean => {
  return !url.startsWith('data:') && url !== 'about:blank'
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

// Rewrites asset URLs through the caller's `assetProxyFn`. The function must be
// idempotent (return an already-proxied URL unchanged): this transform applies
// it to every matching URL on each run and does not detect already-proxied
// URLs, so a wrapping proxy that double-encodes would not be idempotent.
export const proxyAssetUrls: DomTransform = ({ assetProxyFn }) => {
  if (!assetProxyFn) {
    return () => {}
  }

  return (document) => {
    const elements = document.querySelectorAll(proxyableSelectors.join(', '))

    for (const element of elements) {
      switch (element.localName) {
        case 'img': {
          proxyAttribute(element, 'src', 'image', assetProxyFn)
          proxySrcset(element, 'image', assetProxyFn)
          break
        }
        case 'video': {
          proxyAttribute(element, 'src', 'video', assetProxyFn)
          proxyAttribute(element, 'poster', 'image', assetProxyFn)
          break
        }
        case 'audio': {
          proxyAttribute(element, 'src', 'audio', assetProxyFn)
          break
        }
        case 'source': {
          proxyAttribute(element, 'src', sourceTypeFromParent(element), assetProxyFn)
          proxySrcset(element, 'image', assetProxyFn)
          break
        }
        case 'track': {
          proxyAttribute(element, 'src', sourceTypeFromParent(element), assetProxyFn)
          break
        }
        // SVG2 uses `href`; legacy SVG1 uses `xlink:href`.
        case 'image': {
          const attribute = element.hasAttribute('href') ? 'href' : 'xlink:href'
          proxyAttribute(element, attribute, 'image', assetProxyFn)
          break
        }
      }

      if (element.hasAttribute('data-embed-thumbnail')) {
        proxyAttribute(element, 'data-embed-thumbnail', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-embed-avatar')) {
        proxyAttribute(element, 'data-embed-avatar', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-bookmark-icon')) {
        proxyAttribute(element, 'data-bookmark-icon', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-bookmark-thumbnail')) {
        proxyAttribute(element, 'data-bookmark-thumbnail', 'image', assetProxyFn)
      }
    }
  }
}
