import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type {
  CleanUrlFn,
  DomTransform,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
  WidgetResolver,
} from '../../types.js'
import { getElementDimensions } from '../../utils/dom.js'
import { getImageFingerprint, getUrlSizeHint } from '../../utils/images.js'
import { absoluteUrlRegex, resolveOrKeepUrl } from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  createMediaElement,
  isMediaResult,
  prepareEmbedMetadata,
  setDimensions,
} from '../../utils/widgets.js'

// Marks an injected element so a repeat run skips it and stripDuplicateEnclosures (an
// opt-in heuristic) can tell it from the item's own inline content. Exported because
// stripDuplicateEnclosures and assignVideoPosters both read it.
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
//
// The feed's dimensions ride along on the probe, which puts them in the same tier as the size a
// publisher states on a carrier in the content: they win over the resolver's, unless the resolver
// measured the platform better and opted out of declared sizes.
const resolveEnclosure = async (
  url: string,
  enclosure: Enclosure,
  resolvers: ReadonlyArray<WidgetResolver>,
  document: Document,
): Promise<EmbedResolverResult | undefined> => {
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)
  setDimensions(probe, enclosure)

  for (const resolver of resolvers) {
    if (probe.matches(resolver.selector)) {
      const metadata = await resolver.extract(probe)

      // A media result is not an embeddable player page, and the audio/video enclosure
      // branches below already produce the native element for it.
      if (metadata && !isMediaResult(metadata)) {
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
  tag: 'audio' | 'video',
  src: string,
  enclosure: Enclosure,
  context: TransformContext,
): HTMLElement => {
  const poster = resolveOrKeepUrl(
    enclosure.thumbnails?.[0]?.url,
    context.resolveUrlFn,
    context.baseUrl,
  )

  return createMediaElement(document, {
    tag,
    src,
    poster,
    width: enclosure.width,
    height: enclosure.height,
  })
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

  if (src) {
    element.setAttribute('src', src)
  }

  setDimensions(element, enclosure)

  if (enclosure.title) {
    element.setAttribute('alt', enclosure.title)
  }

  return element
}

// Layers the enclosure's own metadata over the resolver result, preferring the feed's
// values for the display fields. The resolver only has URL-derived guesses (e.g. YouTube's
// composed hqdefault thumbnail), while the feed carries the publisher's real thumbnail,
// title, and duration. Identity fields (provider/id/src/url) stay from the resolver.
//
// The size is settled before this: a resolver read the feed's dimensions off the probe, whole,
// through the rule that governs content markup too. Where no resolver claimed the enclosure, the
// feed's dimensions are the only ones there are.
const mergeEnclosureMetadata = (
  resolved: EmbedResolverResult | undefined,
  enclosure: Enclosure,
): Partial<EmbedResolverResult> => {
  return {
    ...(resolved ?? { width: enclosure.width, height: enclosure.height }),
    thumbnail: enclosure.thumbnails?.[0]?.url ?? resolved?.thumbnail,
    title: enclosure.title ?? resolved?.title,
    description: enclosure.description ?? resolved?.description,
    duration: enclosure.duration ?? resolved?.duration,
  }
}

// Whether `incoming` is a better variant of the same image to keep than `kept`. A URL
// with no size encoded in it (`hint === 0`) is treated as the full-res original and
// preferred over any sized copy (a bare `photo.jpg` outranks `photo-800x450.jpg`).
// Between two sized variants the larger wins. On a true tie the no-query URL wins, else
// the first stays.
const isPreferredVariant = (incoming: Enclosure, kept: Enclosure): boolean => {
  const incomingUrl = incoming.url ?? ''
  const keptUrl = kept.url ?? ''
  const incomingHint = getUrlSizeHint(incomingUrl)
  const keptHint = getUrlSizeHint(keptUrl)

  const incomingIsOriginal = incomingHint === 0
  const keptIsOriginal = keptHint === 0
  if (incomingIsOriginal !== keptIsOriginal) {
    return incomingIsOriginal
  }

  if (incomingHint !== keptHint) {
    return incomingHint > keptHint
  }

  return keptUrl.includes('?') && !incomingUrl.includes('?')
}

// Collapse image enclosures that are the same picture at a different size or render:
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

// Query param values that are themselves absolute URLs, e.g. the file URL inside
// a player page like player.example.com/?media_url=<file>.
const extractNestedUrls = (url: string): Array<string> => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return []
  }

  const nested: Array<string> = []

  for (const value of parsed.searchParams.values()) {
    if (absoluteUrlRegex.test(value)) {
      nested.push(value)
    }
  }

  return nested
}

// A player sometimes arrives as raw embed HTML (e.g. rawvoice:embed) instead of a
// URL. Parse it through the DOM so entity decoding and attribute quoting are
// handled properly, and turn the entry into a plain player page entry (url plus
// display size) that mergePlayerEnclosures can pair with its media file.
const extractEnclosureFromEmbed = (enclosure: Enclosure, document: Document): Enclosure => {
  if (!enclosure.playerEmbed) {
    return enclosure
  }

  const { playerEmbed, ...rest } = enclosure
  const container = document.createElement('div')
  container.innerHTML = playerEmbed

  // In real feeds (corpus sample, July 2026) rawvoice:embed is an iframe player in 36 of
  // 40 feeds. The rest wrap a native <audio> for the same file as the enclosure, or plain
  // text. Only frame-able elements count as players, so those others fall through and the
  // enclosure itself still renders.
  const frame = container.querySelector('iframe[src], embed[src]')

  if (!frame) {
    return rest
  }

  const dimensions = getElementDimensions(frame)

  return {
    ...rest,
    url: rest.url ?? frame.getAttribute('src') ?? undefined,
    width: rest.width ?? dimensions.width,
    height: rest.height ?? dimensions.height,
  }
}

// An enclosure in the shape the rest of the pass works with: its player embed folded in, both
// urls absolute. Absolute here rather than at each use, because the fingerprint that collapses
// duplicate images and the gravatar check both read the url as it stands, and one naming no
// host keys as itself and matches nothing.
const readEnclosure = (
  enclosure: Enclosure,
  document: Document,
  context: TransformContext,
): Enclosure => {
  const extracted = extractEnclosureFromEmbed(enclosure, document)

  return {
    ...extracted,
    url: resolveOrKeepUrl(extracted.url, context.resolveUrlFn, context.baseUrl),
    playerUrl: resolveOrKeepUrl(extracted.playerUrl, context.resolveUrlFn, context.baseUrl),
  }
}

// The attribute the injected element carries its source in: `src` on native audio, video,
// and img elements, `data-embed-src` on embed placeholders.
const getInjectedSource = (element: Element): string | null => {
  return element.getAttribute('src') ?? element.getAttribute('data-embed-src')
}

// A feed sometimes lists the same media twice: once as the raw file and once as a
// player page carrying the file URL in a query param (podcast hosts pair a plain
// <enclosure> with a player entry like …/?media_url=<file>; the param name varies
// by host, so any URL-shaped param value counts). Collapse such pairs into the
// file entry with the player page as its playerUrl, so the item renders one
// embedded player instead of a player iframe next to a bare audio element.
const mergePlayerEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const cleanUrl = (url: string): string => {
    return cleanUrlFn ? cleanUrlFn(url) : url
  }

  const result = [...enclosures]
  const removed = new Set<number>()

  const findFileIndex = (nestedUrl: string, playerIndex: number): number => {
    return result.findIndex((candidate, index) => {
      if (index === playerIndex || removed.has(index)) {
        return false
      }

      return typeof candidate.url === 'string' && cleanUrl(candidate.url) === nestedUrl
    })
  }

  for (let playerIndex = 0; playerIndex < result.length; playerIndex++) {
    const player = result[playerIndex]

    if (removed.has(playerIndex) || typeof player.url !== 'string') {
      continue
    }

    for (const nested of extractNestedUrls(player.url)) {
      const fileIndex = findFileIndex(cleanUrl(nested), playerIndex)

      if (fileIndex === -1) {
        continue
      }

      // Keep the file entry's own fields and fill only what it lacks from the
      // player entry (a player page often carries the display size the file
      // doesn't). The earlier position of the two is kept so injection order
      // stays stable.
      const file = result[fileIndex]
      const merged: Enclosure = { ...player, ...file, playerUrl: file.playerUrl ?? player.url }

      result[Math.min(playerIndex, fileIndex)] = merged
      removed.add(Math.max(playerIndex, fileIndex))
      break
    }
  }

  return result.filter((_, index) => !removed.has(index))
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

    const resolvedEnclosures = enclosures.map((enclosure) => {
      return readEnclosure(enclosure, document, context)
    })
    const mergedEnclosures = mergePlayerEnclosures(
      dedupeImageEnclosures(resolvedEnclosures, context.cleanUrlFn),
      context.cleanUrlFn,
    )

    for (const enclosure of mergedEnclosures) {
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

      const src = resolveOrKeepUrl(embedSource, context.resolveUrlFn, context.baseUrl)

      const resolved = await resolveEnclosure(
        embedSource,
        enclosure,
        context.widgetResolvers,
        document,
      )

      // A resolver match, or an explicit player URL (embeddable by the Media RSS spec even
      // when no resolver claims it), produces an embed placeholder.
      if (resolved || enclosure.playerUrl) {
        const metadata = mergeEnclosureMetadata(resolved, enclosure)

        // A resolver rebuilds the src from the parsed id. Without one the enclosure's own
        // URL stands in.
        const prepared = prepareEmbedMetadata({ ...metadata, src: metadata.src ?? src }, context)

        if (!prepared) {
          continue
        }

        created.push(createEmbedPlaceholder(document, prepared))
        continue
      }

      // Only an enclosure with no player page reaches here, so `embedSource` is the enclosure's
      // own URL and `src` is the resolved form of it.
      if (isAudioEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'audio', src, enclosure, context))
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        created.push(createNativeMediaElement(document, 'video', src, enclosure, context))
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

    // Content that already carries a marked element with the same source (typically
    // a previous run of this transform over the same item) already shows that
    // enclosure, so injecting it again would stack a visible duplicate.
    const existingSources = new Set<string>()

    for (const element of document.querySelectorAll(`[${enclosureMarker}]`)) {
      const source = getInjectedSource(element)

      if (source) {
        existingSources.add(source)
      }
    }

    const injected = created.filter((element) => {
      return !existingSources.has(getInjectedSource(element) ?? '')
    })

    // Tag each injected element so the optional stripDuplicateEnclosures pass can
    // recognize it as injected media, not the item's own content.
    for (const element of injected) {
      element.setAttribute(enclosureMarker, '')
    }

    // Prepend ahead of the existing content while preserving enclosure order. A
    // per-item prepend would reverse the order of multi-enclosure items.
    for (let index = injected.length - 1; index >= 0; index--) {
      document.body.prepend(injected[index])
    }
  }
}
