import { parseUrl } from 'trousse'
import type {
  CleanUrlFn,
  DomTransform,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
  WidgetResolver,
} from '../../types.js'
import { getImageFingerprint, getSizeKeywordRank, getUrlSizeHint } from '../../utils/images.js'
import {
  absoluteUrlRegex,
  cleanUrl,
  isOnHosts,
  resolveOrDropUrl,
  resolveOrKeepUrl,
} from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  createImage,
  createMediaElement,
  getEmbedSize,
  isEmbedOrMediaResolver,
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
  return isOnHosts(url, avatarHosts)
}

const resolveEnclosure = async (
  url: string,
  enclosure: Enclosure,
  resolvers: ReadonlyArray<WidgetResolver>,
  document: Document,
): Promise<EmbedResolverResult | undefined> => {
  const embedOrMediaResolvers = resolvers.filter(isEmbedOrMediaResolver)
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)
  setDimensions(probe, enclosure)

  for (const resolver of embedOrMediaResolvers) {
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

// TODO: render the enclosure title and description, <audio> and <video> have no caption slot.
const createNativeMediaElement = (
  document: Document,
  tag: 'audio' | 'video',
  src: string,
  enclosure: Enclosure,
  context: TransformContext,
): HTMLElement => {
  const poster = resolveOrKeepUrl(enclosure.thumbnails?.[0]?.url, context)

  return createMediaElement(document, {
    tag,
    src,
    poster,
    width: enclosure.width,
    height: enclosure.height,
  })
}

// The src arrives resolved from the loop, the way createNativeMediaElement takes its own: an
// image enclosure never carries a player url, so what the loop resolved is this enclosure's own
// url and resolving it a second time here would only be a second chance to disagree.
const injectImageEnclosure = (
  document: Document,
  enclosure: Enclosure,
  src: string,
): HTMLElement | undefined => {
  if (!isImageEnclosure(enclosure)) {
    return
  }

  return createImage(document, {
    src,
    alt: enclosure.title,
    width: enclosure.width,
    height: enclosure.height,
  })
}

// The feed carries the publisher's real thumbnail, title and duration, where a resolver only
// composes a thumbnail from the url, like YouTube's hqdefault.
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

  // A rank of 0 is a keyword the table cannot order, so it must not lose to a ranked one:
  // preview is a thumbnail on one host and full-size on another.
  if (incomingIsOriginal && keptIsOriginal) {
    const incomingRank = getSizeKeywordRank(incomingUrl)
    const keptRank = getSizeKeywordRank(keptUrl)

    if (incomingRank !== 0 && keptRank !== 0 && incomingRank !== keptRank) {
      return incomingRank > keptRank
    }
  }

  return keptUrl.includes('?') && !incomingUrl.includes('?')
}

// A feed often lists one image twice, as an enclosure and a media:content at another size or
// with a ?w= query. An audio or video query string often carries identity, as on a podcast proxy.
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

// rawvoice:embed carries the player as raw embed HTML: an iframe, or a native <audio> for the
// enclosure's own file, or plain text.
const extractEnclosureFromEmbed = (enclosure: Enclosure, document: Document): Enclosure => {
  if (!enclosure.playerEmbed) {
    return enclosure
  }

  const { playerEmbed, ...rest } = enclosure
  const container = document.createElement('div')
  container.innerHTML = playerEmbed

  const frame = container.querySelector('iframe[src], embed[src]')

  if (!frame) {
    return rest
  }

  // The size moves whole from whichever source states one, the enclosure's own Media RSS
  // dimensions first and the frame's otherwise: a width the feed stated beside a height the
  // iframe stated is a box neither describes. A lone height is the size a fixed-height player states.
  const frameSize = getEmbedSize(frame, 0)
  const stated = rest.width || rest.height ? rest : frameSize

  return {
    ...rest,
    url: rest.url ?? frame.getAttribute('src') ?? undefined,
    ...(stated.width && { width: stated.width }),
    ...(stated.height && { height: stated.height }),
  }
}

const readEnclosure = (
  enclosure: Enclosure,
  document: Document,
  context: TransformContext,
): Enclosure => {
  const extracted = extractEnclosureFromEmbed(enclosure, document)

  return {
    ...extracted,
    url: resolveOrKeepUrl(extracted.url, context),
    playerUrl: resolveOrKeepUrl(extracted.playerUrl, context),
  }
}

// The attribute the injected element carries its source in: `src` on native audio, video,
// and img elements, `data-embed-src` on embed placeholders.
const getInjectedSource = (element: Element): string | null => {
  return element.getAttribute('src') ?? element.getAttribute('data-embed-src')
}

// A podcast host pairs a plain <enclosure> with a player page carrying the file url in a query
// param, like …/?media_url=<file>, and the param name varies by host.
const mergePlayerEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const result = [...enclosures]
  const removed = new Set<number>()

  const findFileIndex = (nestedUrl: string, playerIndex: number): number => {
    return result.findIndex((candidate, index) => {
      if (index === playerIndex || removed.has(index)) {
        return false
      }

      return (
        typeof candidate.url === 'string' && cleanUrl(candidate.url, { cleanUrlFn }) === nestedUrl
      )
    })
  }

  for (let playerIndex = 0; playerIndex < result.length; playerIndex++) {
    const player = result[playerIndex]

    if (removed.has(playerIndex) || typeof player.url !== 'string') {
      continue
    }

    for (const nested of extractNestedUrls(player.url)) {
      const fileIndex = findFileIndex(cleanUrl(nested, { cleanUrlFn }), playerIndex)

      if (fileIndex === -1) {
        continue
      }

      const file = result[fileIndex]
      // A player page often carries the display size the file entry lacks.
      const merged: Enclosure = { ...player, ...file, playerUrl: file.playerUrl ?? player.url }

      result[Math.min(playerIndex, fileIndex)] = merged
      removed.add(Math.max(playerIndex, fileIndex))
      break
    }
  }

  return result.filter((_, index) => !removed.has(index))
}

// An enclosure rides outside the item body, so the content alone never shows its media.
export const injectEnclosures: DomTransform = (context) => {
  const enclosures = context.enclosures

  if (!enclosures?.length) {
    return () => {}
  }

  const feedImageFingerprints = new Set(
    context.feedImageUrls?.map((url) => getImageFingerprint(url, context.cleanUrlFn)),
  )

  return async (document) => {
    const created: Array<HTMLElement> = []

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

      // Whatever this enclosure becomes, a player or a native element, the reader loads this url,
      // so an enclosure stating one that will not resolve is not injected at all.
      const src = resolveOrDropUrl(embedSource, context)

      if (!src) {
        continue
      }

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
        const prepared = prepareEmbedMetadata(metadata, context)

        created.push(createEmbedPlaceholder(document, { ...prepared, src: metadata.src ?? src }))
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

      // WordPress attaches the author's gravatar as a per-item media:content image, and Substack
      // fills the enclosure of a post with no cover with the publication logo.
      if (
        isImageEnclosure(enclosure) &&
        (isAvatarEnclosure(embedSource, context.avatarImageHosts) ||
          feedImageFingerprints.has(getImageFingerprint(embedSource, context.cleanUrlFn)))
      ) {
        continue
      }

      // An image enclosure is almost always the lead image, scaled or cropped, on another url.
      if (hasContentImage) {
        continue
      }

      const imageElement = injectImageEnclosure(document, enclosure, src)
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

    // A forward loop of prepends reverses the enclosure order.
    for (let index = injected.length - 1; index >= 0; index--) {
      document.body.prepend(injected[index])
    }
  }
}
