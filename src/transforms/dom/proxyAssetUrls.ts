import { stringifySrcset } from 'srcset'
import type { AssetProxyFn, AssetType, DomTransform } from '../../types.js'
import { svgHrefAttribute } from '../../utils/dom.js'
import { parseSrcset } from '../../utils/images.js'
import { groupUrlAttributesByTag, type UrlAttribute, urlAttributes } from '../../utils/urls.js'

// The rows naming an asset, which is the whole of what this pass acts on. `data-embed-src` is
// media and is deliberately absent: it is the player a reader loads in a frame, not a file a
// proxy can serve.
type ProxyableAttribute = UrlAttribute & { asset: NonNullable<UrlAttribute['asset']> }

const proxyableAttributes = urlAttributes.filter((attribute): attribute is ProxyableAttribute => {
  return attribute.asset !== undefined
})
// A tag-less row is matched on its own attribute, since a placeholder parks it on whatever
// element it replaced; the rest are matched by tag, which is also how an SVG <image> carrying
// its url on xlink:href is reached at all.
const proxyableSelectors = [
  ...new Set(proxyableAttributes.map(({ attribute, tag }) => tag ?? `[${attribute}]`)),
]
const genericAttributes = proxyableAttributes.filter(({ tag }) => !tag)
const tagAttributes = groupUrlAttributesByTag(proxyableAttributes)
// srcset is not a url but a list of them, so it is not a table row: it is rewritten whole and
// only when the proxy changed a candidate. Both tags carrying one already carry a `src` row, so
// the selectors above reach them.
const srcsetTags = new Set(['img', 'source'])

// A `fromParent` row takes its kind from the element above: a <source> or <track> is a video
// track inside a <video>, an audio one inside an <audio>, and an image anywhere else.
const assetTypeOf = (element: Element, asset: ProxyableAttribute['asset']): AssetType => {
  if (asset !== 'fromParent') {
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

// Rewrites asset URLs through the caller's `assetProxyFn`, keeping each proxied URL's
// pre-proxy value in a `data-proxied-<name>` attribute (see preservedAttribute). The function
// must be idempotent (return an already-proxied URL unchanged): this transform applies it to
// every matching URL on each run and does not detect already-proxied URLs, so a wrapping
// proxy that double-encodes would not be idempotent.
export const proxyAssetUrls: DomTransform = ({ assetProxyFn }) => {
  if (!assetProxyFn) {
    return () => {}
  }

  return async (document) => {
    const elements = document.querySelectorAll(proxyableSelectors.join(', '))

    for (const element of elements) {
      const name = element.localName

      for (const { attribute, asset } of tagAttributes[name] ?? []) {
        // An SVG <image> spells its reference either way, and a CSS attribute selector cannot
        // hold the colon, so the spelling is read off the element.
        const spelling = attribute === 'href' ? svgHrefAttribute(element) : attribute

        await proxyAttribute(element, spelling, assetTypeOf(element, asset), assetProxyFn)
      }

      if (srcsetTags.has(name)) {
        await proxySrcset(element, 'image', assetProxyFn)
      }

      for (const { attribute, asset } of genericAttributes) {
        await proxyAttribute(element, attribute, assetTypeOf(element, asset), assetProxyFn)
      }
    }
  }
}
