import { stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'
import { svgHrefAttribute } from '../../utils/dom.js'
import { parseSrcset } from '../../utils/images.js'

const proxyableSelectors = [
  'img',
  'video',
  'audio',
  'source',
  'track',
  'image',
  '[data-embed-thumbnail]',
  '[data-embed-avatar]',
  '[data-cite-icon]',
  '[data-cite-thumbnail]',
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

const dataPrefixRegex = /^data-/
const colonRegex = /:/g

const preservedAttribute = (attribute: string): string => {
  return `data-proxied-${attribute.replace(dataPrefixRegex, '').replace(colonRegex, '-')}`
}

// Stamping on an unchanged value overwrites the original with the proxied url on a second run.
const proxyAttribute = async (
  element: Element,
  attribute: string,
  type: AssetType,
  assetProxyFn: AssetProxyFn,
): Promise<void> => {
  const value = element.getAttribute(attribute)

  if (!value || !isProxyableUrl(value)) {
    return
  }

  const proxied = await assetProxyFn(value, type)

  if (proxied && proxied !== value) {
    element.setAttribute(preservedAttribute(attribute), value)
    element.setAttribute(attribute, proxied)
  }
}

const proxySrcset = async (
  element: Element,
  type: AssetType,
  assetProxyFn: AssetProxyFn,
): Promise<void> => {
  const srcset = element.getAttribute('srcset')

  if (!srcset) {
    return
  }

  let changed = false
  const rewritten = await Promise.all(
    parseSrcset(srcset).map(async (entry) => {
      if (!isProxyableUrl(entry.url)) {
        return entry
      }

      const proxied = await assetProxyFn(entry.url, type)

      if (proxied && proxied !== entry.url) {
        changed = true
        return { ...entry, url: proxied }
      }

      return entry
    }),
  )

  if (!changed) {
    return
  }

  element.setAttribute(preservedAttribute('srcset'), srcset)
  element.setAttribute('srcset', stringifySrcset(rewritten))
}

// An asset url served from the publisher's host, which the reader is to fetch through its proxy.
export const proxyAssetUrls: DomTransform = ({ assetProxyFn }) => {
  if (!assetProxyFn) {
    return () => {}
  }

  return async (document) => {
    const elements = document.querySelectorAll(proxyableSelectors.join(', '))

    for (const element of elements) {
      switch (element.localName) {
        case 'img': {
          await proxyAttribute(element, 'src', 'image', assetProxyFn)
          await proxySrcset(element, 'image', assetProxyFn)
          break
        }
        case 'video': {
          await proxyAttribute(element, 'src', 'video', assetProxyFn)
          await proxyAttribute(element, 'poster', 'image', assetProxyFn)
          break
        }
        case 'audio': {
          await proxyAttribute(element, 'src', 'audio', assetProxyFn)
          break
        }
        case 'source': {
          await proxyAttribute(element, 'src', sourceTypeFromParent(element), assetProxyFn)
          await proxySrcset(element, 'image', assetProxyFn)
          break
        }
        case 'track': {
          await proxyAttribute(element, 'src', sourceTypeFromParent(element), assetProxyFn)
          break
        }
        case 'image': {
          await proxyAttribute(element, svgHrefAttribute(element), 'image', assetProxyFn)
          break
        }
      }

      if (element.hasAttribute('data-embed-thumbnail')) {
        await proxyAttribute(element, 'data-embed-thumbnail', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-embed-avatar')) {
        await proxyAttribute(element, 'data-embed-avatar', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-cite-icon')) {
        await proxyAttribute(element, 'data-cite-icon', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-cite-thumbnail')) {
        await proxyAttribute(element, 'data-cite-thumbnail', 'image', assetProxyFn)
      }
    }
  }
}
