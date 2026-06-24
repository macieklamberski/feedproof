import { normalizeUrl } from 'feedcanon'
import { createEmbedPlaceholder, resolveOrKeepUrl } from '../../common.js'
import type {
  CleanUrlFn,
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
} from '../../types.js'

const existingMediaSelector =
  'audio[src], video[src], iframe[src], source[src], img[src], [data-embed-src]'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

const isImageEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'image' || !!enclosure.type?.startsWith('image/')
}

// Run resolvers against a synthesized iframe carrying the enclosure URL so that
// iframe-shaped resolvers (YouTube etc.) can claim platform-specific enclosures.
const resolveEnclosure = async (
  url: string,
  resolvers: ReadonlyArray<EmbedResolver>,
  document: Document,
): Promise<EmbedResolverResult | undefined> => {
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)

  for (const resolver of resolvers) {
    if (probe.matches(resolver.selector)) {
      const metadata = await resolver.extract(probe)

      if (metadata) {
        return metadata
      }
    }
  }
}

// Size keywords feeds use as a whole filename for a scaled variant, e.g.
// .../{id}/large.jpg vs .../{id}/small.jpg. Conservative on purpose: words like
// "main"/"cover"/"default" are real filenames too often to treat as a size token.
// "wide" and "full" are deliberately left out for the same reason — they read as
// size hints but also turn up as genuine content filenames, and a false match here
// drops a real image. They are still covered when paired with dimensions (e.g.
// "wide__148x84") via dimensionLeaf, so the only thing excluding them loses is the
// rare bare "wide.jpg"/"full.jpg" variant. Add them back if that case shows up
// often enough in the corpus to outweigh the false-match risk.
const sizeKeywordLeaf =
  /^(x?small|x?large|medium|thumb|thumbnail|original|orig|preview)(\.[a-z0-9]+)?$/i

// A leaf that is purely a dimension descriptor, e.g. "640x360" or, with a crop
// name, "original__640x360" / "wide__148x84". No shared filename stem survives.
const dimensionLeaf = /^(.*__)?\d{1,5}x\d{1,5}(\.[a-z0-9]+)?$/i

// A WordPress-style dimension suffix on an otherwise-shared stem, e.g.
// "photo-800x450.jpg" is a scaled copy of "photo.jpg".
const wordpressDimensionSuffix = /-\d{1,5}x\d{1,5}(\.[a-z0-9]+)$/i

// Build a size-agnostic dedup key so a scaled or differently-cropped copy of an
// image already in the content doesn't get injected a second time. Most feeds
// encode the size in the URL and the variants are otherwise identical, so we
// strip the size signal and compare host + path:
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
const buildMediaKey = (rawUrl: string, cleanUrlFn?: CleanUrlFn): string => {
  const cleaned = cleanUrlFn ? cleanUrlFn(rawUrl) : rawUrl
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

// Collect URLs already referenced by media elements so we don't double-inject.
// Querying the DOM is both cheaper and more precise than substring-matching
// the serialized HTML (which would also match URLs appearing in prose).
const collectExistingMediaUrls = (document: Document, cleanUrlFn?: CleanUrlFn): Set<string> => {
  const urls = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src')

    if (src) {
      urls.add(buildMediaKey(src, cleanUrlFn))
    }
  }

  return urls
}

// TODO: render Enclosure `title` and `description` somehow. Neither <audio> nor <video>
// have a native caption slot, and the chosen approach (figure/figcaption wrapper,
// aria-label, data-* attributes, etc.) needs a separate design pass.
const createNativeMediaElement = (
  document: Document,
  tagName: 'audio' | 'video',
  enclosure: Enclosure,
  context: TransformContext,
): HTMLElement => {
  const element = document.createElement(tagName)
  const src = resolveOrKeepUrl(enclosure.url, context.resolveUrlFn, context.baseUrl)
  element.setAttribute('src', src)
  element.setAttribute('controls', '')
  element.setAttribute('preload', 'none')

  if (tagName === 'video') {
    if (enclosure.width) {
      element.setAttribute('width', String(enclosure.width))
    }

    if (enclosure.height) {
      element.setAttribute('height', String(enclosure.height))
    }

    const poster = resolveOrKeepUrl(
      enclosure.thumbnails?.[0]?.url,
      context.resolveUrlFn,
      context.baseUrl,
    )
    if (poster) {
      element.setAttribute('poster', poster)
    }
  }

  return element
}

const injectImageEnclosure = (
  document: Document,
  enclosure: Enclosure,
  context: TransformContext,
): HTMLElement | undefined => {
  if (!isImageEnclosure(enclosure)) {
    return
  }

  const element = document.createElement('img')
  const src = resolveOrKeepUrl(enclosure.url, context.resolveUrlFn, context.baseUrl)
  element.setAttribute('src', src)

  if (enclosure.width) {
    element.setAttribute('width', String(enclosure.width))
  }

  if (enclosure.height) {
    element.setAttribute('height', String(enclosure.height))
  }

  if (enclosure.title) {
    element.setAttribute('alt', enclosure.title)
  }

  return element
}

export const injectEnclosures: DomTransform = (context) => {
  if (!context.enclosures?.length) {
    return () => {}
  }

  const enclosures = context.enclosures

  return async (document) => {
    const existingUrls = collectExistingMediaUrls(document, context.cleanUrlFn)
    const created: Array<HTMLElement> = []

    for (const enclosure of enclosures) {
      // Enclosures come from untrusted feed data, which doesn't honor the required-`url`
      // type. A missing or non-string url would throw in cleanUrlFn/resolveUrlFn and abort
      // the whole transform, so skip it before any URL handling.
      if (typeof enclosure.url !== 'string' || enclosure.url === '') {
        continue
      }

      const mediaKey = buildMediaKey(enclosure.url, context.cleanUrlFn)

      if (existingUrls.has(mediaKey)) {
        continue
      }

      if (!context.resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = await resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        const src = resolveOrKeepUrl(enclosure.url, context.resolveUrlFn, context.baseUrl)
        created.push(createEmbedPlaceholder(document, src, resolved))
        existingUrls.add(mediaKey)
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'audio', enclosure, context))
        existingUrls.add(mediaKey)
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'video', enclosure, context))
        existingUrls.add(mediaKey)
        continue
      }

      const imageElement = injectImageEnclosure(document, enclosure, context)
      if (imageElement) {
        created.push(imageElement)
        existingUrls.add(mediaKey)
      }
    }

    // Prepend ahead of the existing content while preserving enclosure order; a
    // per-item prepend would reverse the order of multi-enclosure items.
    for (let index = created.length - 1; index >= 0; index--) {
      document.body.prepend(created[index])
    }
  }
}
