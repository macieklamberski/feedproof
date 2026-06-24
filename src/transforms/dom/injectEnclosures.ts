import { createEmbedPlaceholder, resolveOrKeepUrl } from '../../common.js'
import type {
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
} from '../../types.js'

// Marks an injected element so stripDuplicateEnclosures (an opt-in heuristic) can
// tell it from the item's own inline content. injectEnclosures itself does not
// dedup — it injects every enclosure. Exported because that pass reads it.
export const enclosureMarker = 'data-enclosure'

// Hosts whose iframe/embed means a video player. Used to tell a video-led item
// (where an image enclosure is the video's poster) from a normal article.
const videoHostPattern =
  /youtube\.com|youtu\.be|player\.vimeo\.com|vimeo\.com\/video|jwplayer|dailymotion\.com|wistia|videopress\.com|brightcove|streamable\.com|v\.redd\.it/i

// Whether the content's primary media is a video: a native <video>, or an embed
// (placeholder or iframe) pointing at a known video host.
const hasVideoEmbed = (document: Document): boolean => {
  if (document.querySelector('video[src], video > source[src]')) {
    return true
  }

  for (const element of document.querySelectorAll('[data-embed-src], iframe[src]')) {
    const src = element.getAttribute('data-embed-src') ?? element.getAttribute('src') ?? ''
    if (videoHostPattern.test(src)) {
      return true
    }
  }

  return false
}

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
    const created: Array<HTMLElement> = []

    // A video-led item with no inline image of its own (e.g. a feed whose body is
    // just a video embed) supplies its featured image as an enclosure, where it is
    // the video's poster rather than a separate picture. Injecting it would stack a
    // still on top of the player, so image enclosures are suppressed in that case.
    const isVideoLed = hasVideoEmbed(document) && !document.querySelector('img[src]')

    for (const enclosure of enclosures) {
      // Enclosures come from untrusted feed data, which doesn't honor the required-`url`
      // type. A missing or non-string url would throw in cleanUrlFn/resolveUrlFn and abort
      // the whole transform, so skip it before any URL handling.
      if (typeof enclosure.url !== 'string' || enclosure.url === '') {
        continue
      }

      if (!context.resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = await resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        const src = resolveOrKeepUrl(enclosure.url, context.resolveUrlFn, context.baseUrl)
        created.push(createEmbedPlaceholder(document, src, resolved))
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'audio', enclosure, context))
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'video', enclosure, context))
        continue
      }

      if (isVideoLed && isImageEnclosure(enclosure)) {
        continue
      }

      const imageElement = injectImageEnclosure(document, enclosure, context)
      if (imageElement) {
        created.push(imageElement)
      }
    }

    // Tag each injected element so the optional stripDuplicateEnclosures pass can
    // recognize it as injected media rather than the item's own content.
    for (const element of created) {
      element.setAttribute(enclosureMarker, '')
    }

    // Prepend ahead of the existing content while preserving enclosure order; a
    // per-item prepend would reverse the order of multi-enclosure items.
    for (let index = created.length - 1; index >= 0; index--) {
      document.body.prepend(created[index])
    }
  }
}
