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

// Normalize a media URL before comparing it for dedup. Running it through the
// consumer's cleanUrlFn means a tracking or cache-buster query (e.g. ?_=2) on an
// inline source no longer hides a matching enclosure, so we don't double-inject it.
const normalizeMediaUrl = (url: string, cleanUrlFn?: CleanUrlFn): string => {
  return cleanUrlFn ? cleanUrlFn(url) : url
}

// Collect URLs already referenced by media elements so we don't double-inject.
// Querying the DOM is both cheaper and more precise than substring-matching
// the serialized HTML (which would also match URLs appearing in prose).
const collectExistingMediaUrls = (document: Document, cleanUrlFn?: CleanUrlFn): Set<string> => {
  const urls = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src')

    if (src) {
      urls.add(normalizeMediaUrl(src, cleanUrlFn))
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

// Image enclosure injection is currently disabled. To re-enable, uncomment the
// call in injectEnclosures' loop below.
// biome-ignore lint/correctness/noUnusedVariables: kept for easy re-enabling
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

      const normalizedUrl = normalizeMediaUrl(enclosure.url, context.cleanUrlFn)

      if (existingUrls.has(normalizedUrl)) {
        continue
      }

      if (!context.resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = await resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        const src = resolveOrKeepUrl(enclosure.url, context.resolveUrlFn, context.baseUrl)
        created.push(createEmbedPlaceholder(document, src, resolved))
        existingUrls.add(normalizedUrl)
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'audio', enclosure, context))
        existingUrls.add(normalizedUrl)
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'video', enclosure, context))
        existingUrls.add(normalizedUrl)
      }

      // Image enclosure injection is disabled for now; uncomment to re-enable.
      // const imageElement = injectImageEnclosure(document, enclosure, context)
      // if (imageElement) {
      //   created.push(imageElement)
      //   existingUrls.add(normalizedUrl)
      // }
    }

    // Prepend ahead of the existing content while preserving enclosure order; a
    // per-item prepend would reverse the order of multi-enclosure items.
    for (let index = created.length - 1; index >= 0; index--) {
      document.body.prepend(created[index])
    }
  }
}
