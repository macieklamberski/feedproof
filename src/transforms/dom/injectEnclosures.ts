import { isHostOf, isSubdomainOf } from 'trousse'
import type {
  CleanUrlFn,
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
} from '../../types.js'
import { createEmbedPlaceholder } from '../../utils/embeds.js'
import { getImageFingerprint, getUrlSizeHint } from '../../utils/images.js'
import { resolveOrKeepUrl } from '../../utils/urls.js'

// Marks an injected element so stripDuplicateEnclosures (an opt-in heuristic) can
// tell it from the item's own inline content. Exported because that pass reads it.
export const enclosureMarker = 'data-enclosure'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

const isImageEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'image' || !!enclosure.type?.startsWith('image/')
}

const isAvatarEnclosure = (url: string, avatarHosts: ReadonlyArray<string>): boolean => {
  return isHostOf(url, avatarHosts) || isSubdomainOf(url, avatarHosts)
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

// Layers the enclosure's own metadata over the resolver result, preferring the feed's
// values for the display fields. The resolver only has URL-derived guesses (e.g. YouTube's
// composed hqdefault thumbnail), while the feed carries the publisher's real thumbnail,
// title, dimensions, and duration. Identity fields (provider/id/src/url) stay from the
// resolver.
const mergeEnclosureMetadata = (
  resolved: EmbedResolverResult | undefined,
  enclosure: Enclosure,
): Partial<EmbedResolverResult> => {
  return {
    ...resolved,
    thumbnail: enclosure.thumbnails?.[0]?.url ?? resolved?.thumbnail,
    title: enclosure.title ?? resolved?.title,
    description: enclosure.description ?? resolved?.description,
    width: enclosure.width ?? resolved?.width,
    height: enclosure.height ?? resolved?.height,
    duration: enclosure.duration ?? resolved?.duration,
  }
}

// Whether `incoming` is a better variant of the same image to keep than `kept`. A URL
// with no size encoded in it (`hint === 0`) is treated as the full-res original and
// preferred over any sized copy (a bare `photo.jpg` outranks `photo-800x450.jpg`).
// Between two sized variants the larger wins; on a true tie the no-query URL wins, else
// the first stays.
const isPreferredVariant = (incoming: Enclosure, kept: Enclosure): boolean => {
  const incomingHint = getUrlSizeHint(incoming.url)
  const keptHint = getUrlSizeHint(kept.url)

  const incomingIsOriginal = incomingHint === 0
  const keptIsOriginal = keptHint === 0
  if (incomingIsOriginal !== keptIsOriginal) {
    return incomingIsOriginal
  }

  if (incomingHint !== keptHint) {
    return incomingHint > keptHint
  }

  return kept.url.includes('?') && !incoming.url.includes('?')
}

// Collapse image enclosures that are the same picture at a different size or render —
// a scaled copy, a CDN-proxied variant, or just a `?w=` query (a feed often lists one
// image as a native enclosure plus a media:content). Without this they each inject as a
// stacked copy. Keyed by getImageFingerprint (the same size-agnostic key the duplicate
// stripper uses), keeping the largest variant, then the no-query original, then the
// first. Only images collapse: audio/video query strings often carry identity (podcast
// proxies), so those pass through untouched.
const dedupeImageEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const indexByKey = new Map<string, number>()
  const result: Array<Enclosure> = []

  for (const enclosure of enclosures) {
    if (typeof enclosure.url !== 'string' || !isImageEnclosure(enclosure)) {
      result.push(enclosure)
      continue
    }

    const key = getImageFingerprint(enclosure.url, cleanUrlFn)
    const existingIndex = indexByKey.get(key)

    if (existingIndex === undefined) {
      indexByKey.set(key, result.length)
      result.push(enclosure)
      continue
    }

    if (isPreferredVariant(enclosure, result[existingIndex])) {
      result[existingIndex] = enclosure
    }
  }

  return result
}

export const injectEnclosures: DomTransform = (context) => {
  const enclosures = context.enclosures

  if (!enclosures?.length) {
    return () => {}
  }

  return async (document) => {
    const created: Array<HTMLElement> = []

    // An image enclosure is almost always the same picture as the lead content image,
    // just a scaled or cropped copy on a different URL, so injecting it stacks a visible
    // duplicate. Only inject it when the content has no image of its own, the case where
    // the enclosure supplies the missing visual (e.g. an image-only feed with no body
    // markup). Audio and video enclosures have no inline equivalent, so they always inject.
    const hasContentImage = !!document.querySelector('img[src], picture, [data-embed-thumbnail]')

    for (const enclosure of dedupeImageEnclosures(enclosures, context.cleanUrlFn)) {
      // The embeddable URL: a media:player console (when present) is the canonical thing to
      // embed, otherwise the content URL. Enclosures come from untrusted feed data that
      // doesn't honor the required-`url` type, so guard before any URL handling.
      const embedSource = enclosure.playerUrl ?? enclosure.url

      if (typeof embedSource !== 'string' || embedSource === '') {
        continue
      }

      if (!context.resolveUrlFn(embedSource, context.baseUrl)) {
        continue
      }

      const resolved = await resolveEnclosure(embedSource, context.embedResolvers, document)

      // A resolver match, or an explicit player URL (embeddable by the Media RSS spec even
      // when no resolver claims it), produces an embed placeholder.
      if (resolved || enclosure.playerUrl) {
        const src = resolveOrKeepUrl(embedSource, context.resolveUrlFn, context.baseUrl)
        created.push(
          createEmbedPlaceholder(document, src, mergeEnclosureMetadata(resolved, enclosure)),
        )
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

      // WordPress attaches the author's gravatar as a per-item media:content image.
      // It is the author's avatar, not post imagery, so never inject it as the lead
      // image of an otherwise imageless item.
      if (isImageEnclosure(enclosure) && isAvatarEnclosure(embedSource, context.avatarImageHosts)) {
        continue
      }

      if (hasContentImage) {
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
