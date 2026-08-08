import type { DomTransform, MediaResolverResult } from '../../types.js'
import {
  getElementDimensions,
  getWrapperAspectRatio,
  playableElements,
  ratioDimensions,
} from '../../utils/dom.js'
import { audioFileRegex, resolveOrKeepUrl, videoFileRegex } from '../../utils/urls.js'
import { createEmbedPlaceholder, isMediaResult } from '../../utils/widgets.js'

const playableSelector = [...playableElements].join(', ')

// When the iframe carries no usable dimensions, fall back to a responsive wrapper's
// aspect ratio so the placeholder can still reserve space.
const getEmbedDimensions = (element: Element): { width?: number; height?: number } => {
  const dimensions = getElementDimensions(element)

  if (dimensions.width === undefined && dimensions.height === undefined) {
    const ratio = getWrapperAspectRatio(element)

    if (ratio !== undefined) {
      return ratioDimensions(ratio)
    }
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
  const { widgetResolvers, mediaSrcAttributes, resolveUrlFn, cleanUrlFn, baseUrl } = context

  return async (document) => {
    // A static snapshot: the fallback loop below replaces iframes, and a live
    // getElementsByTagName collection would shrink mid-iteration and skip elements.
    const iframeSnapshot = Array.from(document.getElementsByTagName('iframe'))
    const hasIframes = iframeSnapshot.length > 0

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
      if (!hasIframes && resolver.selector.startsWith('iframe')) {
        continue
      }

      for (const element of document.querySelectorAll(resolver.selector)) {
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
        }

        element.replaceWith(createEmbedPlaceholder(document, placeholderMetadata))
      }
    }

    // Generic iframe fallback. Resolvers may have detached some iframes (parentNode null).
    if (hasIframes) {
      for (const iframe of iframeSnapshot) {
        if (!iframe.parentNode) {
          continue
        }

        const src = iframe.getAttribute('src')

        // resolveUrlFn rejects `about:blank`; the trim drops empty/whitespace placeholders
        // (which would otherwise resolve to the base URL).
        const resolved = src?.trim() ? resolveUrlFn(src, baseUrl) : undefined
        // Unlike a resolver's src, which is rebuilt from the parsed id, this one is the
        // publisher's own URL and also becomes the fallback anchor's href and link text.
        const cleaned = resolved ? (cleanUrlFn?.(resolved) ?? resolved) : undefined

        if (!cleaned) {
          continue
        }

        // An iframe framing a bare media file plays as the element instead: the reader
        // gets a native player, and the src flows through the media passes downstream.
        const mediaTag = getMediaTag(cleaned)

        if (mediaTag) {
          iframe.replaceWith(createMediaElement(document, { tag: mediaTag, src: cleaned }))
          continue
        }

        iframe.replaceWith(
          createEmbedPlaceholder(document, { src: cleaned, ...getEmbedDimensions(iframe) }),
        )
      }
    }

    // Legacy <object data> / <embed src> carriers — the iframe-only paths above miss
    // them. Replace with a provider-less placeholder when the URL resolves.
    for (const element of document.querySelectorAll('object[data], embed[src]')) {
      const url =
        element.localName === 'object' ? element.getAttribute('data') : element.getAttribute('src')
      const resolved = url ? resolveUrlFn(url, baseUrl) : undefined
      const cleaned = resolved ? (cleanUrlFn?.(resolved) ?? resolved) : undefined

      if (!cleaned) {
        continue
      }

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
