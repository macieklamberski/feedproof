import { composeEmbedUrl, readSrcMediaId, safeMediaIdRegex } from '../../embeds/wistia.js'
import type { DomTransform } from '../../types.js'
import { attr, parseRatio } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

// Pulls the hashed id out of the `wistia_async_{id}` class the facade carries.
const wistiaIdPattern = /\bwistia_async_([A-Za-z0-9]+)/

// The facade states its kind in a second class token beside the id. A channel is its own player,
// so the media route built from a channel id names no media.
const channelFacadePattern = /\bwistia_channel\b/

// The wistia_async_{id} div is the JS-API inline embed and <wistia-player media-id> the current
// form. A bare medias/{id}.jsonp script remains when a feed keeps the loader but drops the div.
// Dropping the iframe arm lets a loader script beside a real iframe mint a second player.
const wistiaSelector = [
  '[class*="wistia_async_"]',
  'wistia-player[media-id]',
  'script[src*="/embed/medias/"]',
  'iframe[src*="wistia"]',
].join(', ')

// Both carry the media id in the src path, which the platform module reads: the selector matches
// them on a substring, so nothing before `readSrcMediaId` has looked at the host.
const srcCarrierTags = new Set(['script', 'iframe'])

const readMediaId = (element: Element): string | undefined => {
  if (element.localName === 'wistia-player') {
    return attr(element, 'media-id')
  }

  if (srcCarrierTags.has(element.localName)) {
    return readSrcMediaId(attr(element, 'src'))
  }

  return element.className.match(wistiaIdPattern)?.[1]
}

// Wistia's async div, <wistia-player> element and loader script all render nothing without JS.
// Wistia's poster needs the media JSON hop, so none of them states a thumbnail.
export const rebuildWistiaEmbeds: DomTransform = () => (document) => {
  const elements = Array.from(document.querySelectorAll(wistiaSelector))

  // An id already carried by a div, a custom element or a real iframe. Collected before any
  // rebuilding because document order does not put the script last.
  const carried = new Set(
    elements
      .filter((element) => element.localName !== 'script')
      .map(readMediaId)
      .filter((mediaId): mediaId is string => mediaId !== undefined),
  )

  for (const element of elements) {
    if (element.localName === 'iframe') {
      continue
    }

    const mediaId = readMediaId(element)

    if (!mediaId || !safeMediaIdRegex.test(mediaId)) {
      continue
    }

    if (element.localName === 'script' && carried.has(mediaId)) {
      continue
    }

    const route = channelFacadePattern.test(element.className ?? '') ? 'channel' : 'iframe'
    const iframe = createIframe(document, composeEmbedUrl(route, mediaId))

    // The custom element's aspect is a bare decimal.
    const ratio = parseRatio(attr(element, 'aspect') ?? '')

    // Written as the CSS property it is, not as width and height attributes: the facade states
    // a shape and never a size, and the widget pass reads `aspect-ratio` off the rebuilt iframe
    // the same as it reads one off any responsive wrapper.
    if (ratio) {
      iframe.setAttribute('style', `aspect-ratio: ${ratio}`)
    }

    // Replace the outermost Wistia wrapper so the padding/sizing divs go with it. The
    // padding div is the outer of the two, so prefer it. Fall back to the wrapper, then
    // to the embed div when there is no responsive wrapper around it.
    const padding = element.closest('.wistia_responsive_padding')
    const wrapper = element.closest('.wistia_responsive_wrapper')
    const target = padding ?? wrapper ?? element

    target.replaceWith(iframe)
  }
}
