import { stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'
import { hrefAttribute } from '../../utils/dom.js'
import { parseSrcset } from '../../utils/images.js'
import { groupUrlAttributesByTag, type UrlAttribute, urlAttributes } from '../../utils/urls.js'

type ProxyableAttribute = UrlAttribute & { asset: NonNullable<UrlAttribute['asset']> }

const proxyableAttributes = urlAttributes.filter((attribute): attribute is ProxyableAttribute => {
  return attribute.asset !== undefined
})
// A tag-less attribute is matched on its own, since a placeholder parks it on whatever element
// it replaced; the rest are matched by tag, which is also how an SVG <image> carrying its url
// on xlink:href is reached.
const proxyableSelectors = [
  ...new Set(proxyableAttributes.map(({ attribute, tag }) => tag ?? `[${attribute}]`)),
]
const genericAttributes = proxyableAttributes.filter((attribute) => !attribute.tag)
const tagAttributes = groupUrlAttributesByTag(proxyableAttributes)

// A `parent` attribute takes its kind from the element above: a <source> or <track> is a video
// track inside a <video>, an audio one inside an <audio>, and an image anywhere else.
const assetTypeOf = (element: Element, asset: ProxyableAttribute['asset']): AssetType => {
  if (asset !== 'parent') {
    return asset
  }

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
      for (const { asset, attribute } of tagAttributes[element.localName] ?? []) {
        const type = assetTypeOf(element, asset)

        if (attribute === 'srcset') {
          proxySrcset(element, type, assetProxyFn)
          continue
        }

        const name = attribute === 'href' ? hrefAttribute(element) : attribute

        proxyAttribute(element, name, type, assetProxyFn)
      }

      for (const { asset, attribute } of genericAttributes) {
        proxyAttribute(element, attribute, assetTypeOf(element, asset), assetProxyFn)
      }
    }
  }
}
