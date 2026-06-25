import { addMissingProtocol, normalizeUrl, resolveUrl } from 'feedcanon'
import { removeWithEmptyWrappers } from '../../common.js'
import type { CleanUrlFn, DomTransform } from '../../types.js'
import { enclosureMarker } from './injectEnclosures.js'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

// Size words a feed uses as a whole filename for a scaled variant, e.g.
// .../{id}/large.jpg vs .../{id}/small.jpg. Defined as a list with provenance
// (like urlpurify's tracking-param literals) then joined into the leaf matcher.
// "generic" means a common cross-platform size word, not a single source.
//
// Conservative on purpose: "main"/"cover"/"default"/"wide"/"full" are left out —
// they read as size hints but turn up as real content filenames often enough that
// a false match would drop a genuine image. (wide/full are still covered when
// paired with dimensions, e.g. "wide__148x84", via dimensionLeaf.) Add a keyword
// here only if the corpus shows it earns its keep against that false-match risk.
const sizeKeywordLiterals = [
  // Generic keys.
  'small',
  'xsmall',
  'medium',
  'large',
  'xlarge',
  'thumb',
  'thumbnail',
  'preview',
  'original',
  'orig',
]
const sizeKeywordLeaf = new RegExp(`^(?:${sizeKeywordLiterals.join('|')})(\\.[a-z0-9]+)?$`, 'i')

const decodeSource = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// The capture is (or resolves to) a URL: absolute, protocol-relative, or relative
// to the proxy's own origin (a Cloudflare relative path, Next.js, wsrv).
const resolvedSource = (capture: string, proxy: URL): string | undefined => {
  return resolveUrl(decodeSource(capture), proxy.origin)
}

// The capture is a bare host+path with the scheme stripped (Photon): re-add it.
const bareHostSource = (capture: string): string => {
  return addMissingProtocol(decodeSource(capture))
}

// Image CDNs that wrap the real source URL inside their own request. We key on the
// inner source so different render params of the same image (width, format,
// quality, crop) collapse to one. Each entry pairs a pattern that captures the
// wrapped source with how to turn that capture into an absolute URL, noted with
// provenance like urlpurify's tracking lists. Only host- or path-anchored proxies
// are listed; self-hosted ones with no canonical host (imgproxy, willnorris) would
// need shape-matching, which risks false matches.
const imageProxies: Array<{
  pattern: RegExp
  toSource: (capture: string, proxy: URL) => string | undefined
}> = [
  // Cloudinary fetch, incl. Substack substackcdn.com: .../image/fetch/{opts}/{src url}.
  { pattern: /\/image\/fetch\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // Cloudflare Image Resizing, incl. beehiiv: .../cdn-cgi/image/{opts}/{src}, where
  // {src} is an absolute URL or a path relative to the proxy's own host.
  { pattern: /\/cdn-cgi\/image\/[^/]+\/(.+)$/i, toSource: resolvedSource },
  // ImageKit web proxy: ik.imagekit.io/{id}/[tr:..]/{src url}.
  { pattern: /ik\.imagekit\.io\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // WordPress Photon / Jetpack: i{0-3}.wp.com/{src-host}/{path}, scheme stripped.
  { pattern: /\/\/i[0-3]\.wp\.com\/([^?]+)/i, toSource: bareHostSource },
  // wsrv.nl / images.weserv.nl: source in the url= query param.
  {
    pattern: /(?:wsrv\.nl|images\.weserv\.nl)\/\?(?:[^#]*&)?url=([^&]+)/i,
    toSource: resolvedSource,
  },
  // Next.js / Vercel image optimizer: source in the url= query param.
  { pattern: /\/_next\/image\?(?:[^#]*&)?url=([^&]+)/i, toSource: resolvedSource },
]

// A leaf that is purely a dimension descriptor, e.g. "640x360" or, with a crop
// name, "original__640x360" / "wide__148x84". No shared filename stem survives.
const dimensionLeaf = /^(.*__)?\d{1,5}x\d{1,5}(\.[a-z0-9]+)?$/i
// A WordPress-style dimension suffix on an otherwise-shared stem, e.g.
// "photo-800x450.jpg" is a scaled copy of "photo.jpg".
const wordpressDimensionSuffix = /-\d{1,5}x\d{1,5}(\.[a-z0-9]+)$/i

// If the URL is a known image-proxy wrapper, return its inner source URL so the
// key is built from the real image rather than the proxy's render params.
const unwrapProxiedImage = (url: string): string => {
  let proxy: URL
  try {
    proxy = new URL(url)
  } catch {
    return url
  }

  for (const { pattern, toSource } of imageProxies) {
    const match = url.match(pattern)

    if (match) {
      return toSource(match[1], proxy) ?? url
    }
  }

  return url
}

// Size-agnostic dedup key for images: a scaled or differently-cropped copy of an
// image already in the content shares this key. Most feeds encode the size in the
// URL and the variants are otherwise identical, so we strip the size signal and
// compare host + path:
//   - unwrap an image-proxy URL (e.g. Substack's Cloudinary fetch) to its inner
//     source, so the same image under different render params collapses
//   - normalize host the same safe way feedcanon compares feed URLs: drop a
//     leading www., lowercase the host (DNS is case-insensitive), and normalize
//     percent-encoding/unicode/duplicate slashes. The key is host + path with no
//     protocol, so http and https collapse together too. The path's case is left
//     alone — it is case-sensitive on most servers.
//   - drop the query (cache-busters and ?w=/?width= render params)
//   - collapse a WordPress -WxH suffix back to the base filename
//   - drop a leaf that is only dimensions or only a size keyword (no stem to keep)
// The whole-leaf drops require a parent path to anchor on, so two unrelated
// root-level files like /large.jpg and /small.jpg are never collapsed.
const buildImageKey = (rawUrl: string, cleanUrlFn?: CleanUrlFn): string => {
  const cleaned = unwrapProxiedImage(cleanUrlFn ? cleanUrlFn(rawUrl) : rawUrl)
  // Keep the protocol (stripProtocol off) so the result stays a parseable URL;
  // it is dropped below when the key is assembled from host + path.
  const normalized = normalizeUrl(cleaned, {
    stripWww: true,
    stripHash: true,
    collapseSlashes: true,
    normalizeEncoding: true,
    normalizeUnicode: true,
  })

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return normalized
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (segments.length) {
    const lastIndex = segments.length - 1
    const leaf = segments[lastIndex]

    if (wordpressDimensionSuffix.test(leaf)) {
      segments[lastIndex] = leaf.replace(wordpressDimensionSuffix, '$1')
    } else if (segments.length > 1 && (dimensionLeaf.test(leaf) || sizeKeywordLeaf.test(leaf))) {
      segments.pop()
    }
  }

  return `${parsed.host}/${segments.join('/')}`
}

// Audio/video/embed have no scaled variants, and their identity often lives in the
// query (podcast proxies like `…/play.mp3?url={episode}`), so the image key's
// query-drop would collapse distinct episodes. Match them on the exact cleaned URL.
const buildMediaKey = (element: Element, cleanUrlFn?: CleanUrlFn): string => {
  const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src') ?? ''

  if (element.localName === 'img') {
    return buildImageKey(src, cleanUrlFn)
  }

  return cleanUrlFn ? cleanUrlFn(src) : src
}

// Removes an injected enclosure media element that duplicates inline content —
// an image already present (in any size variant) or an audio/video/embed with the
// same URL. Runs after injectEnclosures, which marks the elements it injects.
export const stripDuplicateEnclosures: DomTransform = (context) => (document) => {
  const contentKeys = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    if (element.hasAttribute(enclosureMarker)) {
      continue
    }

    contentKeys.add(buildMediaKey(element, context.cleanUrlFn))
  }

  for (const element of document.querySelectorAll(`[${enclosureMarker}]`)) {
    if (contentKeys.has(buildMediaKey(element, context.cleanUrlFn))) {
      removeWithEmptyWrappers(element)
      continue
    }

    // Keep it — but drop the marker so it doesn't leak into the output.
    element.removeAttribute(enclosureMarker)
  }
}
