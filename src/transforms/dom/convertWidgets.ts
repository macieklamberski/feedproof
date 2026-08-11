import type { DomTransform, MediaResolverResult } from '../../types.js'
import {
  getElementDimensions,
  getWrapperRatioDimensions,
  playableElements,
} from '../../utils/dom.js'
import { audioFileRegex, resolveOrKeepUrl, videoFileRegex } from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  embedCarrierSelector,
  isMediaResult,
  parseOrKeepDate,
  readCarrierUrl,
} from '../../utils/widgets.js'

const playableSelector = [...playableElements].join(', ')

// When the iframe carries no usable dimensions, fall back to a responsive wrapper's
// aspect ratio so the placeholder can still reserve space.
const getEmbedDimensions = (element: Element): { width?: number; height?: number } => {
  const dimensions = getElementDimensions(element)

  if (dimensions.width === undefined && dimensions.height === undefined) {
    return getWrapperRatioDimensions(element) ?? dimensions
  }

  return dimensions
}

// The tag a bare URL should play as, or undefined when it is not a media file at all.
// Streaming manifests (.m3u8, .mpd) are deliberately not matched (see the regexes): they
// play natively only in Safari, so promoting one produces a broken player elsewhere.
const getMediaTag = (url: string): MediaResolverResult['tag'] | undefined => {
  if (videoFileRegex.test(url)) {
    return 'video'
  }

  if (audioFileRegex.test(url)) {
    return 'audio'
  }
}

const createMediaElement = (document: Document, result: MediaResolverResult): HTMLElement => {
  const media = document.createElement(result.tag)
  media.setAttribute('src', result.src)
  media.setAttribute('controls', '')

  // <audio> has no poster, so it is written only where it renders.
  if (result.poster && result.tag === 'video') {
    media.setAttribute('poster', result.poster)
  }

  if (result.width) {
    media.setAttribute('width', String(result.width))
  }

  if (result.height) {
    media.setAttribute('height', String(result.height))
  }

  return media
}

// A container that parks its media URL in an attribute and builds the player with JS, so a
// reader shows nothing (Discourse video placeholders, Beaver Builder row backgrounds, the
// Drupal audio field, several WordPress audio players). Mirrors convertLazyImageContainers,
// which does the same for an image: the value has to name a media file, which is what keeps
// a generic attribute like `data-src` from matching something that is not media.
const findParkedMedia = (
  element: Element,
  attributes: Array<string>,
): MediaResolverResult | undefined => {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)?.trim()

    if (!value) {
      continue
    }

    const tag = getMediaTag(value)

    if (tag) {
      return { tag, src: value }
    }
  }
}

// The widget pass: one registry of resolvers whose result shape decides the output. An
// embed result becomes an opaque `data-embed-*` placeholder; a media result becomes a real
// <video>/<audio> that the later passes then neutralize, proxy and deduplicate against the
// enclosures like any other. The generic tiers below apply the same split to embeds no
// resolver claims: a src that names a media file plays directly instead of being framed.
export const convertWidgets: DomTransform = (context) => {
  const { widgetResolvers, mediaSrcAttributes, resolveUrlFn, cleanUrlFn, parseDateFn, baseUrl } =
    context

  return async (document) => {
    // One query per distinct selector rather than per resolver: every url-keyed resolver
    // shares the same one, and the fallback at the end reuses that same result, so the
    // registry and the fallback can never disagree about what a carrier is. The arrays are
    // static because both loops replace elements, and a live collection would shrink
    // mid-iteration and skip some.
    const queried = new Map<string, Array<Element>>()

    const elementsFor = (selector: string): Array<Element> => {
      const cached = queried.get(selector)

      if (cached) {
        return cached
      }

      const found = Array.from(document.querySelectorAll(selector))
      queried.set(selector, found)

      return found
    }

    // Parked-URL containers go first, while original iframes still exist: the guard reads
    // "already wraps a player" from the markup, and the tiers below replace iframes with
    // placeholder divs the guard would no longer recognize.
    for (const element of document.querySelectorAll('div, figure, span, li')) {
      // A container that already wraps something playable is chrome around a real player,
      // and the attribute belongs to that player rather than to a missing element.
      if (element.querySelector(playableSelector)) {
        continue
      }

      const parked = findParkedMedia(element, mediaSrcAttributes)

      if (!parked) {
        continue
      }

      const resolved = resolveOrKeepUrl(parked.src, resolveUrlFn, baseUrl)
      const cleaned = cleanUrlFn?.(resolved) ?? resolved

      // The container often holds a caption or a track title, which is content rather than
      // player chrome, so the media goes in front of it instead of replacing it.
      element.prepend(createMediaElement(document, { tag: parked.tag, src: cleaned }))
    }

    for (const resolver of widgetResolvers) {
      for (const element of elementsFor(resolver.selector)) {
        // Legacy Flash pairs an `<object>` with a nested `<embed>` and a url-keyed resolver
        // matches both. Replacing the outer one detaches the inner, which is still in this
        // snapshot.
        if (!element.parentNode) {
          continue
        }

        const metadata = await resolver.extract(element)

        if (!metadata) {
          continue
        }

        const resolvedSrc = resolveUrlFn(metadata.src, baseUrl)

        if (!resolvedSrc) {
          continue
        }

        if (isMediaResult(metadata)) {
          const poster = resolveOrKeepUrl(metadata.poster, resolveUrlFn, baseUrl)

          element.replaceWith(
            createMediaElement(document, { ...metadata, src: resolvedSrc, poster }),
          )
          continue
        }

        let resolvedUrl: string | undefined

        if (metadata.url) {
          resolvedUrl = resolveUrlFn(metadata.url, baseUrl)

          if (!resolvedUrl) {
            continue
          }
        }

        const { width, height } = getEmbedDimensions(element)

        // A rebuild transform (e.g. a lazy-load facade) may have recovered the publisher's
        // real poster and stashed it on the element as `data-thumbnail`. Prefer it over the
        // resolver's URL-derived guess, which is only a safe-default size (e.g. YouTube's
        // hqdefault) — the carried poster is the exact frame the publisher chose.
        const carriedThumbnail = element.getAttribute('data-thumbnail') || undefined

        const placeholderMetadata = {
          ...metadata,
          src: resolvedSrc,
          url: resolvedUrl,
          thumbnail: resolveOrKeepUrl(
            carriedThumbnail ?? metadata.thumbnail,
            resolveUrlFn,
            baseUrl,
          ),
          avatar: resolveOrKeepUrl(metadata.avatar, resolveUrlFn, baseUrl),
          width: width ?? metadata.width,
          height: height ?? metadata.height,
          date: parseOrKeepDate(metadata.date, parseDateFn),
        }

        element.replaceWith(createEmbedPlaceholder(document, placeholderMetadata))
      }
    }

    // Whatever no resolver claimed. A resolver may have replaced an element that is still in
    // the snapshot, including the inner half of an <object>/<embed> pair, so a detached one
    // is already handled.
    for (const element of elementsFor(embedCarrierSelector)) {
      if (!element.parentNode) {
        continue
      }

      const src = readCarrierUrl(element)

      // resolveUrlFn rejects `about:blank`; the trim drops empty/whitespace placeholders
      // (which would otherwise resolve to the base URL).
      const resolved = src.trim() ? resolveUrlFn(src, baseUrl) : undefined
      // Unlike a resolver's src, which is rebuilt from the parsed id, this one is the
      // publisher's own URL and also becomes the fallback anchor's href and link text.
      const cleaned = resolved ? (cleanUrlFn?.(resolved) ?? resolved) : undefined

      if (!cleaned) {
        continue
      }

      // A carrier framing a bare media file plays as the element instead: the reader gets a
      // native player, and the src flows through the media passes downstream.
      const mediaTag = getMediaTag(cleaned)

      if (mediaTag) {
        element.replaceWith(createMediaElement(document, { tag: mediaTag, src: cleaned }))
        continue
      }

      element.replaceWith(
        createEmbedPlaceholder(document, { src: cleaned, ...getEmbedDimensions(element) }),
      )
    }
  }
}
