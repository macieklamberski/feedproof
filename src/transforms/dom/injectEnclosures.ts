import type {
  DomTransform,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
  WidgetResolver,
} from '../../types.js'
import {
  isAudioEnclosure,
  isAvatarEnclosure,
  isImageEnclosure,
  isVideoEnclosure,
  prepareEnclosures,
} from '../../utils/enclosures.js'
import { cleanUrl, resolveOrDropUrl, resolveOrKeepUrl } from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  createImage,
  createMediaElement,
  isEmbedOrMediaResolver,
  isMediaResult,
  prepareEmbedMetadata,
  setDimensions,
} from '../../utils/widgets.js'

// Marks an injected element so a repeat run skips it and stripDuplicateEnclosures (an
// opt-in heuristic) can tell it from the item's own inline content. Exported because
// stripDuplicateEnclosures and assignVideoPosters both read it.
export const enclosureMarker = 'data-enclosure'

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

// The attribute the injected element carries its source in: `src` on native audio, video,
// and img elements, `data-embed-src` on embed placeholders.
const getInjectedSource = (element: Element): string | null => {
  return element.getAttribute('src') ?? element.getAttribute('data-embed-src')
}

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

    // An image enclosure is almost always the same picture as the lead content image,
    // just a scaled or cropped copy on a different URL, so injecting it stacks a visible
    // duplicate. Only inject it when the content has no image of its own, the case where
    // the enclosure supplies the missing visual (e.g. an image-only feed with no body
    // markup). Audio and video enclosures have no inline equivalent, so they always inject.
    const hasContentImage = !!document.querySelector('img[src], picture, [data-embed-thumbnail]')

    for (const enclosure of prepareEnclosures(enclosures, document, context)) {
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

      // WordPress attaches the author's gravatar as a per-item media:content image, and
      // Substack fills the enclosure of a post with no cover with the publication logo.
      // Neither is post imagery, so never inject one as the lead image of an otherwise
      // imageless item.
      if (
        isImageEnclosure(enclosure) &&
        (isAvatarEnclosure(embedSource, context.avatarImageHosts) ||
          feedImageFingerprints.has(getImageFingerprint(embedSource, context.cleanUrlFn)))
      ) {
        continue
      }

      if (hasContentImage) {
        continue
      }

      const imageElement = injectImageEnclosure(document, enclosure, src)

      if (imageElement) {
        created.push(imageElement)
      }
    }

    // A source that is already on the page, put there by a previous run or by an earlier entry
    // in this one, would show up twice. That happens when a feed names one file twice, or when
    // every enclosure of an item inherits the same media:embed. Sources compare cleaned, so a
    // tracking parameter does not make two copies of one file look different.
    const injectedSources = new Set<string>()

    for (const element of document.querySelectorAll(`[${enclosureMarker}]`)) {
      const source = getInjectedSource(element)

      if (source) {
        injectedSources.add(cleanUrl(source, { cleanUrlFn: context.cleanUrlFn }))
      }
    }

    const injected = created.filter((element) => {
      const source = getInjectedSource(element)

      if (!source) {
        return true
      }

      const key = cleanUrl(source, { cleanUrlFn: context.cleanUrlFn })

      if (injectedSources.has(key)) {
        return false
      }

      injectedSources.add(key)
      return true
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
