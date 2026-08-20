import type { DomTransform, MediaResolverResult } from '../../types.js'
import { attr, hasText, playableElements } from '../../utils/dom.js'
import {
  audioFileRegex,
  cleanUrl,
  flashFileRegex,
  resolveOrDropUrl,
  resolveOrKeepUrl,
  videoFileRegex,
} from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  createMediaElement,
  embedCarrierSelector,
  getEmbedSize,
  isMediaResult,
  prepareEmbedMetadata,
  readCarrierUrl,
} from '../../utils/widgets.js'

const playableSelector = [...playableElements].join(', ')

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

// A container that parks its media URL in an attribute and builds the player with JS, so a reader
// shows nothing (Discourse video placeholders, Beaver Builder row backgrounds, the Drupal audio
// field, several WordPress audio players). The value has to name a media file, which is what keeps
// a generic attribute like `data-src` from matching something that is not media.
const findParkedMedia = (
  element: Element,
  attributes: Array<string>,
): MediaResolverResult | undefined => {
  for (const attribute of attributes) {
    const value = attr(element, attribute)

    if (!value) {
      continue
    }

    const tag = getMediaTag(value)

    if (tag) {
      return { tag, src: value }
    }
  }
}

// A Flash `<object>` is a shell around its carrier: `classid`, `codebase` and a pile of
// `<param>`s, none of which renders anything. Replacing the shell rather than the carrier
// inside it is what keeps the conversion from leaving dead markup wrapped around the
// placeholder. An object holding its own text or other elements is a real fallback the
// publisher wrote, so that one keeps its content and only the carrier is replaced.
const carrierOrShell = (element: Element): Element => {
  const parent = element.parentElement

  if (parent?.localName !== 'object' || hasText(parent)) {
    return element
  }

  const others = Array.from(parent.children).filter(
    (child) => child !== element && child.localName !== 'param',
  )

  return others.length ? element : parent
}

// The widget pass: one registry of resolvers whose result shape decides the output. An
// embed result becomes an opaque `data-embed-*` placeholder. A media result becomes a real
// <video>/<audio> that the later passes then neutralize, proxy and deduplicate against the
// enclosures like any other. The generic tiers below apply the same split to embeds no
// resolver claims: a src that names a media file plays directly instead of being framed.
export const convertWidgets: DomTransform = (context) => {
  const { widgetResolvers, mediaSrcAttributes } = context

  return async (document) => {
    // One query per distinct selector instead of per resolver: every url-keyed resolver
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
      // and the attribute belongs to that player, not to a missing element.
      if (element.querySelector(playableSelector)) {
        continue
      }

      const parked = findParkedMedia(element, mediaSrcAttributes)

      if (!parked) {
        continue
      }

      // Kept rather than dropped, unlike every other src the pass mints. The url sits in a
      // `data-*` attribute no browser reads, so the container renders nothing on its own and
      // refusing the url would take the media out of the item. A player that fails to load still
      // says a video was here.
      const resolved = resolveOrKeepUrl(parked.src, context)
      const cleaned = cleanUrl(resolved, context)

      // The container often holds a caption or a track title, which is content, not player
      // chrome, so the media goes in front of it instead of replacing it.
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

        const src = resolveOrDropUrl(metadata.src, context)

        if (!src) {
          continue
        }

        if (isMediaResult(metadata)) {
          const poster = resolveOrKeepUrl(metadata.poster, context)
          const mediaElement = createMediaElement(document, { ...metadata, src, poster })

          carrierOrShell(element).replaceWith(mediaElement)
          continue
        }

        // A rebuild transform (e.g. a lazy-load facade) may have recovered the publisher's
        // real poster and stashed it on the element as `data-thumbnail`. Prefer it over the
        // resolver's URL-derived guess, which is only a safe-default size (e.g. YouTube's
        // hqdefault): the carried poster is the exact frame the publisher chose.
        const carriedThumbnail = attr(element, 'data-thumbnail')

        const prepared = prepareEmbedMetadata(
          { ...metadata, thumbnail: carriedThumbnail ?? metadata.thumbnail },
          context,
        )
        const placeholder = createEmbedPlaceholder(document, { ...prepared, src })

        carrierOrShell(element).replaceWith(placeholder)
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

      // resolveUrlFn rejects `about:blank`.
      const resolved = resolveOrDropUrl(src, context)
      // This src is the publisher's own URL, not one minted from a parsed id, so it arrives
      // with whatever tracking params they pasted.
      const cleaned = cleanUrl(resolved, context)

      if (!cleaned) {
        continue
      }

      // A carrier still pointing at a `.swf` is left alone, not framed. A placeholder
      // would be the worst option: it reads as resolved, so a reader draws a click-to-load
      // button for a file no browser has been able to run since 2021, and minting it here
      // would also discard the `<object>`'s fallback content. Untouched, the markup degrades
      // by the platform's own rules instead: a browser renders an object's fallback children
      // when it cannot run the object, and an allowlist sanitizer that drops the shell keeps
      // them the same way. The Flash resolvers run above this and are unaffected: each reads
      // a real id out of its carrier and mints a modern player, so only what nothing could
      // repair gets here.
      if (flashFileRegex.test(cleaned)) {
        continue
      }

      // A carrier framing a bare media file plays as the element instead: the reader gets a
      // native player, and the src flows through the media passes downstream.
      const mediaTag = getMediaTag(cleaned)

      if (mediaTag) {
        const mediaElement = createMediaElement(document, { tag: mediaTag, src: cleaned })

        carrierOrShell(element).replaceWith(mediaElement)
        continue
      }

      const placeholder = createEmbedPlaceholder(document, {
        src: cleaned,
        ...getEmbedSize(element),
      })

      carrierOrShell(element).replaceWith(placeholder)
    }
  }
}
