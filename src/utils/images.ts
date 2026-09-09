import { addMissingProtocol, normalizeUrl, resolveUrl } from 'feedcanon'
import { parseSrcset as parseRawSrcset } from 'srcset'
import { getPathSegments, parseUrl, toMap } from 'trousse'
import type { CleanUrlFn } from '../types.js'
import { pixelDimensionLimit } from './dom.js'
import { decodeOrKeep, placeholderBaseUrl } from './urls.js'

// The parser reads a bare `225w` with no url as that candidate's url, and a proxy 404s on it.
// A Jetpack bug ships `…768w, 225w, 563w` with only the first url present.
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

// Seeded from the last entry: a density-only list states no width and ascends.
export const widestSrcsetUrl = (srcset: string | null | undefined): string | undefined => {
  const entries = srcset ? parseSrcset(srcset) : []

  if (entries.length === 0) {
    return
  }

  const widest = entries.reduce(
    (best, entry) => {
      return (entry.width ?? 0) > (best.width ?? 0) ? entry : best
    },
    entries[entries.length - 1],
  )

  return widest.url || undefined
}

// No main, cover, default, wide or full: each turns up as a real content filename.
const sizeKeywordRanks = toMap({
  thumb: 1,
  thumbnail: 1,
  xsmall: 2,
  small: 3,
  medium: 4,
  large: 5,
  xlarge: 6,
  orig: 7,
  original: 7,
  preview: 0, // Dedups but never wins: full-size on some hosts
})
export const sizeKeywordLiterals = [...sizeKeywordRanks.keys()]
const sizeKeywordLeaf = new RegExp(`^(?:${sizeKeywordLiterals.join('|')})(\\.[a-z0-9]+)?$`, 'i')

// The capture is (or resolves to) a URL: absolute, protocol-relative, or relative
// to the proxy's own origin (a Cloudflare relative path, Next.js, wsrv).
const resolvedSource = (capture: string, proxy: URL): string | undefined => {
  const source = decodeOrKeep(capture)

  return source && resolveUrl(source, proxy.origin)
}

// The capture is a bare host+path with the scheme stripped (Photon): re-add it.
const bareHostSource = (capture: string): string | undefined => {
  const source = decodeOrKeep(capture)

  return source && addMissingProtocol(source)
}

type ImageProxy = {
  pattern: RegExp
  toSource: (capture: string, proxy: URL) => string | undefined
}
const imageProxies: Array<ImageProxy> = [
  // Cloudflare Image Resizing, which beehiiv serves its images through.
  { pattern: /\/cdn-cgi\/image\/[^/]+\/(.+)$/i, toSource: resolvedSource },
  // Cloudflare passthrough.
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
  // Cloudinary fetch, which Substack's substackcdn.com serves its images through.
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
  // Wix: media/{id}~mv2.{ext}/v1/{transform}/{file}: key on the id before /v1/.
  { host: /wixstatic\.com$/i, strip: /\/v1\/.+$/i, replace: '' },
  // Ghost.
  { strip: /\/content\/images\/size\/w\d+(?:h\d+)?\//i, replace: '/content/images/' },
  // Cloudinary upload.
  // /image/upload/{signature?}/{transforms?}/{file}, the transforms comma-joined.
  {
    strip: /\/image\/upload\/(?:s--[^/]+--\/)?(?:[a-z]{1,3}_[^/,]+(?:,[a-z]{1,3}_[^/,]+)*\/)*/i,
    replace: '/image/upload/',
  },
  // Medium: miro.medium.com/v2/{transforms}/{id}(-{width}).{ext}: key on the bare id.
  { host: /miro\.medium\.com$/i, strip: /\/v2\/(?:[^/]+\/)+/i, replace: '/' },
  { host: /miro\.medium\.com$/i, strip: /(?:-\d{2,4})?\.[a-z]+$/i, replace: '' },
  // Dwell: images.dwell.com/{album}/{id}-{size}/{file}: key on the bare id.
  {
    host: /images\.dwell\.com$/i,
    strip: new RegExp(`(?<=/\\d{6,})-(?:${sizeKeywordLiterals.join('|')})(?=/[^/]+$)`, 'i'),
    replace: '',
  },
]

// phpBB's `download/file.php?id=` and Wikidot's `avatar.php?userid=` name the image in the query.
const scriptExtensionLiterals = ['php', 'aspx', 'ashx', 'axd', 'cgi']
const scriptLeaf = new RegExp(`\\.(?:${scriptExtensionLiterals.join('|')})$`, 'i')

// A leaf that is only a dimension: `640x360`, `wide__148x84`.
const dimensionLeaf = /^(.*__)?\d{1,5}x\d{1,5}(\.[a-z0-9]+)?$/i
// A scaled copy's suffix: `photo-800x450.jpg`, `photo_800x450.jpg`. WordPress writes the hyphen.
const dimensionSuffix = /[-_]\d{1,5}x\d{1,5}(\.[a-z0-9]+)$/i

// A proxy url can wrap another, a Cloudinary fetch of a Cloudinary upload.
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

// A key two renditions of one image share, whatever their size, crop or proxy.
export const getImageFingerprint = (rawUrl: string, cleanUrlFn?: CleanUrlFn): string => {
  const cleaned = unwrapProxiedImage(cleanUrlFn ? cleanUrlFn(rawUrl) : rawUrl)
  // With stripProtocol the result would not parse, so the protocol goes when the key is built.
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

    // Dropping the query here collapses every image a script endpoint serves into one key.
    if (scriptLeaf.test(leaf)) {
      return `${parsed.host}/${segments.join('/')}${parsed.search}`
    }

    // The leaf drops need a parent path, or `/large.jpg` and `/small.jpg` collapse into one key.
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

const urlPairRegex = /(?:^|[/_=-])(\d{2,5})x(\d{2,5})(?=[._\-&)?/]|$)/gi
const urlQueryWidthRegex = /[?&](?:w|width)=(\d{2,5})\b/i
const urlQueryHeightRegex = /[?&](?:h|height)=(\d{2,5})\b/i

// A `data:` src is a lazy placeholder and carries no size.
export const getUrlDimensions = (
  src: string | null | undefined,
): { width: number; height: number } | undefined => {
  if (!src || src.startsWith('data:')) {
    return
  }

  // Explicit w/h query params win. Otherwise the last WxH pair in the path or
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

export const getSizeKeywordRank = (url: string): number => {
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!parsed) {
    return 0
  }

  // Mastodon puts the keyword in the directory, not the file name, so every segment is tried.
  for (const segment of [...getPathSegments(parsed)].reverse()) {
    const stem = segment.replace(leafExtensionRegex, '').toLowerCase()
    const rank = sizeKeywordRanks.get(stem)

    if (rank !== undefined) {
      return rank
    }
  }

  return 0
}

// One signal is a tie: the unmeasured url may be the original, and that reading is the caller's.
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
