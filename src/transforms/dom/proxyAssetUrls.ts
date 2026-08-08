import { stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'
import { parseSrcset } from '../../utils/images.js'
import { rewriteGalleryItemUrls } from '../../utils/widgets.js'

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
  '[data-gallery-items]',
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

// Preserves the pre-proxy value of a source attribute as `data-proxied-<name>`: a leading
// `data-` is dropped and colons become hyphens, so `src` → `data-proxied-src`,
// `data-embed-thumbnail` → `data-proxied-embed-thumbnail`, `xlink:href` →
// `data-proxied-xlink-href`. A reader can fall back to the original when the proxied URL
// fails (link-rot self-heal), or use it for dedup.
const preservedAttribute = (attribute: string): string => {
  return `data-proxied-${attribute.replace(dataPrefixRegex, '').replace(colonRegex, '-')}`
}

// Stamps the original URL only if the proxy actually changed the value. The change guard
// keeps the transform idempotent: on a second run the value is already proxied, an
// idempotent assetProxyFn returns it unchanged, so the first run's original is not
// overwritten with the proxied URL.
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

  if (proxied && proxied !== value) {
    element.setAttribute(preservedAttribute(attribute), value)
    element.setAttribute(attribute, proxied)
  }
}

const proxySrcset = (element: Element, type: AssetType, assetProxyFn: AssetProxyFn): void => {
  const srcset = element.getAttribute('srcset')

  if (!srcset) {
    return
  }

  let changed = false
  const rewritten = parseSrcset(srcset).map((entry) => {
    if (!isProxyableUrl(entry.url)) {
      return entry
    }

    const proxied = assetProxyFn(entry.url, type)

    if (proxied && proxied !== entry.url) {
      changed = true
      return { ...entry, url: proxied }
    }

    return entry
  })

  if (!changed) {
    return
  }

  element.setAttribute(preservedAttribute('srcset'), srcset)
  element.setAttribute('srcset', stringifySrcset(rewritten))
}

// Rewrites asset URLs through the caller's `assetProxyFn`, keeping each proxied URL's
// pre-proxy value in a `data-proxied-<name>` attribute (see preservedAttribute). The function
// must be idempotent (return an already-proxied URL unchanged): this transform applies it to
// every matching URL on each run and does not detect already-proxied URLs, so a wrapping
// proxy that double-encodes would not be idempotent.
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

      if (element.hasAttribute('data-cite-icon')) {
        proxyAttribute(element, 'data-cite-icon', 'image', assetProxyFn)
      }

      if (element.hasAttribute('data-cite-thumbnail')) {
        proxyAttribute(element, 'data-cite-thumbnail', 'image', assetProxyFn)
      }

      // Proxy the display `url` of each gallery item (inside the data-gallery-items JSON),
      // matching the fallback <img> that the generic pass above already proxies. The
      // full-size `fullUrl` is a link, so it is left alone like the fallback <a href>.
      rewriteGalleryItemUrls(element, (url, key) => {
        if (key !== 'url' || !isProxyableUrl(url)) {
          return
        }

        return assetProxyFn(url, 'image')
      })
    }
  }
}
