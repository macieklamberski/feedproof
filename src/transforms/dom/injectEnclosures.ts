import { createEmbedPlaceholder } from '../../common.js'
import type {
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

// Collect URLs already referenced by media elements so we don't double-inject.
// Querying the DOM is both cheaper and more precise than substring-matching
// the serialized HTML (which would also match URLs appearing in prose).
const collectExistingMediaUrls = (document: Document): Set<string> => {
  const urls = new Set<string>()

  for (const element of document.querySelectorAll(existingMediaSelector)) {
    const src = element.getAttribute('src') ?? element.getAttribute('data-embed-src')

    if (src) {
      urls.add(src)
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
  element.setAttribute('src', enclosure.url)
  element.setAttribute('controls', '')
  element.setAttribute('preload', 'none')

  if (tagName === 'video') {
    if (enclosure.width) {
      element.setAttribute('width', String(enclosure.width))
    }

    if (enclosure.height) {
      element.setAttribute('height', String(enclosure.height))
    }

    const poster = enclosure.thumbnails?.[0]?.url
    if (poster && context.resolveUrlFn(poster, context.baseUrl)) {
      element.setAttribute('poster', poster)
    }
  }

  return element
}

const createImageElement = (document: Document, enclosure: Enclosure): HTMLElement => {
  const element = document.createElement('img')
  element.setAttribute('src', enclosure.url)

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
    const existingUrls = collectExistingMediaUrls(document)

    for (const enclosure of enclosures) {
      if (existingUrls.has(enclosure.url)) {
        continue
      }

      if (!context.resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = await resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        document.body.prepend(createEmbedPlaceholder(document, enclosure.url, resolved))
        existingUrls.add(enclosure.url)
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'audio', enclosure, context))
        existingUrls.add(enclosure.url)
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'video', enclosure, context))
        existingUrls.add(enclosure.url)
        continue
      }

      if (isImageEnclosure(enclosure)) {
        document.body.prepend(createImageElement(document, enclosure))
        existingUrls.add(enclosure.url)
      }
    }
  }
}
