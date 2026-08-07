import { addMissingProtocol, normalizeUrl, resolveUrl } from 'feedcanon'
import { parseSrcset as parseRawSrcset } from 'srcset'
import { getPathSegments, parseUrl } from 'trousse'
import type { CleanUrlFn } from '../types.js'
import { pixelDimensionLimit } from './dom.js'

// A candidate whose url is only a width/density descriptor (`225w`, `2x`), which a real
// image url never is. The `srcset` parser is lenient: when a feed drops the urls and
// leaves bare descriptors — a Jetpack/WordPress bug that ships `…768w, 225w, 563w` with
// only the first url present — it reads each stray descriptor as a candidate whose url
// IS the descriptor. Resolving that against the base url or handing it to an asset proxy
// produces a request for a page that does not exist, so the wrapper below drops them.
const descriptorOnlyUrl = /^\d+(?:\.\d+)?[wx]$/i
// The lenient parser can leave a trailing comma on a malformed candidate's url.
const trailingComma = /,$/

export const parseSrcset = (srcset: string): ReturnType<typeof parseRawSrcset> => {
  return parseRawSrcset(srcset).filter((candidate) => {
    return !descriptorOnlyUrl.test(candidate.url.replace(trailingComma, ''))
  })
}

// Candidate count before the descriptor-only filter, so a caller can tell whether
// parseSrcset dropped any and rewrite the attribute accordingly.
export const countSrcsetCandidates = (srcset: string): number => {
  return parseRawSrcset(srcset).length
}

// Size words a feed uses as a whole filename for a scaled variant, e.g.
// .../{id}/large.jpg vs .../{id}/small.jpg. Defined with provenance (like urlpurify's
// tracking-param literals): the keys join into the leaf matcher, and the rank orders two
// variants of one image so pickLargerImageUrl can keep the larger. Rank 0 means the word
// dedups but is too ambiguous to win or lose a size comparison.
//
// Conservative on purpose: "main"/"cover"/"default"/"wide"/"full" are left out. They
// read as size hints but turn up as real content filenames often enough that a false
// match would drop a genuine image. (wide/full are still covered when paired with
// dimensions, e.g. "wide__148x84", via dimensionLeaf.) Add a keyword here only if the
// corpus shows it earns its keep against that false-match risk.
const sizeKeywordRanks: Record<string, number> = {
  thumb: 1,
  thumbnail: 1,
  xsmall: 2,
  small: 3,
  medium: 4,
  large: 5,
  xlarge: 6,
  orig: 7,
  original: 7,
  preview: 0, // Ambiguous: a "preview" is a thumbnail on one host and full-size on another.
}
export const sizeKeywordLiterals = Object.keys(sizeKeywordRanks)
const sizeKeywordLeaf = new RegExp(`^(?:${sizeKeywordLiterals.join('|')})(\\.[a-z0-9]+)?$`, 'i')

const decodeUrlPart = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// The capture is (or resolves to) a URL: absolute, protocol-relative, or relative
// to the proxy's own origin (a Cloudflare relative path, Next.js, wsrv).
const resolvedSource = (capture: string, proxy: URL): string | undefined => {
  return resolveUrl(decodeUrlPart(capture), proxy.origin)
}

// The capture is a bare host+path with the scheme stripped (Photon): re-add it.
const bareHostSource = (capture: string): string => {
  return addMissingProtocol(decodeUrlPart(capture))
}

// Image CDNs/proxies that wrap the real source URL inside their own request — one
// entry per service. We key on the inner source so different render params of the same
// image (width, format, quality, crop) collapse to one. Each pattern is host- or
// path-anchored to a single CDN and captures the wrapped source (a url= query param, a
// full URL at the end of the path, or a bare host+path for Photon); toSource turns that
// capture into an absolute URL. Deliberately an explicit list rather than a generic
// catch-all, so it stays auditable — an unlisted proxy is simply left as-is.
type ImageProxy = {
  pattern: RegExp
  toSource: (capture: string, proxy: URL) => string | undefined
}
const imageProxies: Array<ImageProxy> = [
  // Cloudflare Image Resizing (incl. beehiiv): .../cdn-cgi/image/{opts}/{src}, where
  // {src} may be a path relative to the proxy's own host.
  { pattern: /\/cdn-cgi\/image\/[^/]+\/(.+)$/i, toSource: resolvedSource },
  // Cloudflare plain passthrough: .../cdn-cgi/plain/{src url}.
  { pattern: /\/cdn-cgi\/plain\/(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // WordPress Photon / Jetpack: i{0-3}.wp.com/{src-host}/{path}, scheme stripped.
  { pattern: /\/\/i[0-3]\.wp\.com\/([^?]+)/i, toSource: bareHostSource },
  // wsrv.nl / images.weserv.nl: source in the url= query param.
  {
    pattern: /(?:wsrv\.nl|images\.weserv\.nl)\/\?(?:[^#]*&)?url=([^&]+)/i,
    toSource: resolvedSource,
  },
  // Next.js / Vercel image optimizer: source in the url= query param.
  { pattern: /\/_next\/image\?(?:[^#]*&)?url=([^&]+)/i, toSource: resolvedSource },
  // Blogger opensocial gadget proxy: gadgets/proxy?url={src}.
  {
    pattern:
      /images-blogger-opensocial\.googleusercontent\.com\/gadgets\/proxy\?(?:[^#]*&)?url=([^&]+)/i,
    toSource: resolvedSource,
  },
  // Brightspot dims (NPR, LA Times, Scripps): *.brightspotcdn.com/dims{3,4}/.../?url={src}.
  { pattern: /\.brightspotcdn\.com\/dims\d\/.*[?&]url=([^&]+)/i, toSource: resolvedSource },
  // Cloudinary fetch (incl. Substack substackcdn.com): .../image/fetch/{opts}/{src url}.
  { pattern: /\/image\/fetch\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // ImageKit web proxy: ik.imagekit.io/{id}/[tr:..]/{src url}.
  { pattern: /ik\.imagekit\.io\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // Hatena image scaler: cdn.image.st-hatena.com/image/scale/{sig}/{opts}/{src url}.
  { pattern: /cdn\.image\.st-hatena\.com\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // dev.to image optimizer: media*.dev.to/dynamic/image/{opts}/{src url}.
  { pattern: /\.dev\.to\/dynamic\/image\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // Yahoo image API: *.yimg.com/{ns}/api/res/{ver}/{opts}/{src url}.
  { pattern: /\.yimg\.com\/.*?\/api\/res\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
  // podigee (podcast art): images.podigee-cdn.net/{opts}/{src url}.
  { pattern: /\.podigee-cdn\.net\/.*?(https?(?:%3a|:).+)$/i, toSource: resolvedSource },
]

// CDN "path transform" images: the render/size lives in a path segment of a
// self-hosted CDN image (no embedded source URL to unwrap). Strip the transform so
// renditions of one image collapse. Host-gated, or path-anchored when the CDN runs on
// the publisher's own domain (Ghost, Cloudinary upload).
type PathTransform = { host?: RegExp; strip: RegExp; replace: string }
const pathTransforms: Array<PathTransform> = [
  // Blogger / Blogspot / Google image hosts: .../{key}/s1600/{file}, /w640-h480/, and
  // the newer =s1600 suffix form.
  {
    host: /(?:\.bp\.blogspot\.com|\.blogspot\.com|\.googleusercontent\.com)$/i,
    strip: /\/(?:s\d{1,4}|w\d{1,4}-h\d{1,4})(?:-[a-z]{1,3})*(?=\/[^/]+$)/i,
    replace: '',
  },
  {
    host: /\.googleusercontent\.com$/i,
    strip: /=(?:s\d{1,4}|w\d{1,4}-h\d{1,4})(?:-[a-z]{1,3})*$/i,
    replace: '',
  },
  // Wix: media/{id}~mv2.{ext}/v1/{transform}/{file} — key on the id before /v1/.
  { host: /wixstatic\.com$/i, strip: /\/v1\/.+$/i, replace: '' },
  // Ghost (self-hosted): /content/images/size/w{N}/... — drop the size directory.
  { strip: /\/content\/images\/size\/w\d+(?:h\d+)?\//i, replace: '/content/images/' },
  // Cloudinary upload (self-hosted, host-agnostic): /image/upload/{signature?}/
  // {transforms?}/... — strip the signature and comma-joined transform segments.
  {
    strip: /\/image\/upload\/(?:s--[^/]+--\/)?(?:[a-z]{1,3}_[^/,]+(?:,[a-z]{1,3}_[^/,]+)*\/)*/i,
    replace: '/image/upload/',
  },
  // Medium: miro.medium.com/v2/{transforms}/{id}(-{width}).{ext} — key on the bare id.
  { host: /miro\.medium\.com$/i, strip: /\/v2\/(?:[^/]+\/)+/i, replace: '/' },
  { host: /miro\.medium\.com$/i, strip: /(?:-\d{2,4})?\.[a-z]+$/i, replace: '' },
]

// Server scripts that pick which image to serve from the query, so the query carries the
// image's identity instead of render params (phpBB `download/file.php?id=`, Wikidot
// `avatar.php?userid=`). Extensionless URLs are deliberately out: they are CDN render
// endpoints whose query is exactly the width/quality noise the key drops.
const scriptExtensionLiterals = ['php', 'aspx', 'ashx', 'axd', 'cgi']
const scriptLeaf = new RegExp(`\\.(?:${scriptExtensionLiterals.join('|')})$`, 'i')

// A leaf that is purely a dimension descriptor, e.g. "640x360" or, with a crop
// name, "original__640x360" / "wide__148x84". No shared filename stem survives.
const dimensionLeaf = /^(.*__)?\d{1,5}x\d{1,5}(\.[a-z0-9]+)?$/i
// A dimension suffix on an otherwise-shared stem: a scaled copy, e.g.
// "photo-800x450.jpg" or "photo_800x450.jpg" of "photo.jpg". Both separators occur
// in the corpus — hyphen (WordPress) on ~10% of feeds, underscore on ~1.5%. The
// width-only "_800x" and retina "@2x" shapes stay out, each below 0.1% of feeds.
const dimensionSuffix = /[-_]\d{1,5}x\d{1,5}(\.[a-z0-9]+)$/i

// If the URL is a known image-proxy wrapper, return its inner source URL so the key
// is built from the real image rather than the proxy's render params. Loops so a
// proxy that wraps another proxy (e.g. a Cloudinary fetch of a Cloudinary upload)
// fully unwraps; the depth cap and same-value check stop any runaway.
const unwrapProxiedImage = (url: string): string => {
  let current = url

  for (let depth = 0; depth < 5; depth++) {
    const proxy = parseUrl(current)

    if (!proxy) {
      break
    }

    let next = current

    for (const { pattern, toSource } of imageProxies) {
      const match = current.match(pattern)

      if (match) {
        next = toSource(match[1], proxy) ?? current
        break
      }
    }

    if (next === current) {
      break
    }

    current = next
  }

  return current
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
//   - drop the query (cache-busters and ?w=/?width= render params), except on a script
//     endpoint, where the query names the image instead of describing a rendition
//   - collapse a -WxH or _WxH dimension suffix back to the base filename
//   - drop a leaf that is only dimensions or only a size keyword (no stem to keep)
// The whole-leaf drops require a parent path to anchor on, so two unrelated
// root-level files like /large.jpg and /small.jpg are never collapsed.
export const getImageFingerprint = (rawUrl: string, cleanUrlFn?: CleanUrlFn): string => {
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

  const parsed = parseUrl(normalized)

  if (!parsed) {
    return normalized
  }

  // Strip a CDN render segment from the path (Blogger /s1600/, Wix /v1/, Cloudinary
  // upload transforms, ...) so renditions of one image collapse before the leaf checks.
  let path = `/${getPathSegments(parsed).join('/')}`

  for (const { host, strip, replace } of pathTransforms) {
    if (host && !host.test(parsed.host)) {
      continue
    }

    path = path.replace(strip, replace)
  }

  const segments = path.split('/').filter(Boolean)

  if (segments.length) {
    const lastIndex = segments.length - 1
    const leaf = segments[lastIndex]

    // Keep the query for a script endpoint: without it every image the endpoint serves on
    // one host collapses to a single key, and two unrelated attachments read as duplicates.
    if (scriptLeaf.test(leaf)) {
      return `${parsed.host}/${segments.join('/')}${parsed.search}`
    }

    if (segments.length > 1 && dimensionLeaf.test(leaf)) {
      segments.pop()
    } else if (dimensionSuffix.test(leaf)) {
      segments[lastIndex] = leaf.replace(dimensionSuffix, '$1')
    } else if (segments.length > 1 && sizeKeywordLeaf.test(leaf)) {
      segments.pop()
    }
  }

  return `${parsed.host}/${segments.join('/')}`
}

// Dimensions encoded in the image URL: a filename or path `800x600`, `?w=&h=` /
// `?width=&height=`, or `s=WxH`. This is the intrinsic size of that rendition, a
// safer source than an inline-style display box. A `data:` placeholder (a lazy
// image not yet resolved) carries no size and is skipped.
const urlPairRegex = /(?:^|[/_=-])(\d{2,5})x(\d{2,5})(?=[._\-&)?]|$)/gi
const urlQueryWidthRegex = /[?&](?:w|width)=(\d{2,5})\b/i
const urlQueryHeightRegex = /[?&](?:h|height)=(\d{2,5})\b/i

export const getUrlDimensions = (
  src: string | null,
): { width: number; height: number } | undefined => {
  if (!src || src.startsWith('data:')) {
    return
  }

  // Explicit w/h query params win; otherwise the last WxH pair in the path or
  // filename (the rendition size sits after any path digits).
  let width = Number(urlQueryWidthRegex.exec(src)?.[1])
  let height = Number(urlQueryHeightRegex.exec(src)?.[1])

  if (!(width > pixelDimensionLimit && height > pixelDimensionLimit)) {
    const pair = [...src.matchAll(urlPairRegex)].at(-1)
    width = Number(pair?.[1])
    height = Number(pair?.[2])
  }

  if (width > pixelDimensionLimit && height > pixelDimensionLimit) {
    return { width, height }
  }
}

// A comparable size signal for ranking variants of the same image when picking which
// to keep. Full area when both dimensions are present; otherwise a width-only signal
// (`?w=`/`?width=`, or the width of a `WxH` pair) so a `?w=900` beats a `?w=300` even
// without a height; 0 when nothing is encoded.
export const getUrlSizeHint = (url: string): number => {
  const dimensions = getUrlDimensions(url)
  if (dimensions) {
    return dimensions.width * dimensions.height
  }

  const queryWidth = Number(urlQueryWidthRegex.exec(url)?.[1])
  if (queryWidth > 0) {
    return queryWidth
  }

  const pairWidth = Number([...url.matchAll(urlPairRegex)].at(-1)?.[1])
  return pairWidth > 0 ? pairWidth : 0
}

const leafExtensionRegex = /\.[a-z0-9]+$/i

// Rank of a URL whose file name is a size keyword, 0 when it is not (or is a rank-0
// ambiguous one). Only meaningful between two URLs that already share a fingerprint:
// the comparison is then within one host's own directory naming, where small vs large
// is unambiguous, not a cross-CDN convention.
export const getSizeKeywordRank = (url: string): number => {
  // The base only anchors a relative src so its leaf can be read; it never surfaces.
  const parsed = parseUrl(url, 'https://example.com')

  if (!parsed) {
    return 0
  }

  const leaf = getPathSegments(parsed).at(-1) ?? ''
  const stem = leaf.replace(leafExtensionRegex, '').toLowerCase()

  return sizeKeywordRanks[stem] ?? 0
}

// Picks the strictly larger of two same-image URLs. Encoded dimensions decide first;
// when neither side encodes any, two ranked size-keyword file names (large.jpg beside
// small.jpg) decide instead. Returns undefined on a tie or when only one side carries
// a signal: a URL that encodes no size may be the unscaled original or just
// unmeasurable, and which way to read that is the caller's tie policy, not this
// function's.
export const pickLargerImageUrl = (first: string, second: string): string | undefined => {
  const firstHint = getUrlSizeHint(first)
  const secondHint = getUrlSizeHint(second)

  if (firstHint > 0 && secondHint > 0 && firstHint !== secondHint) {
    return firstHint > secondHint ? first : second
  }

  if (firstHint > 0 || secondHint > 0) {
    return
  }

  const firstRank = getSizeKeywordRank(first)
  const secondRank = getSizeKeywordRank(second)

  if (firstRank === 0 || secondRank === 0 || firstRank === secondRank) {
    return
  }

  return firstRank > secondRank ? first : second
}
