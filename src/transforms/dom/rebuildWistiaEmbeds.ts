import type { DomTransform } from '../../types.js'
import { attr, parseRatio } from '../../utils/dom.js'

// Pulls the hashed id out of the `wistia_async_{id}` class the facade carries.
const wistiaIdPattern = /\bwistia_async_([A-Za-z0-9]+)/

// The script form names the media as a JSONP payload: `/embed/medias/{id}.jsonp`.
const scriptMediaPattern = /\/embed\/medias\/([A-Za-z0-9]+)(?:\.jsonp)?/

// Every id sampled from the corpus is exactly 10 alphanumeric characters.
const mediaIdRegex = /^[A-Za-z0-9]{10}$/

// Three carriers, one player. The `wistia_async_{id}` div is the JS-API inline embed, the
// `<wistia-player media-id>` custom element is Wistia's current form, and a bare
// `<script src=".../embed/medias/{id}.jsonp">` is what remains when a feed keeps the loader
// but drops the div. None of them renders anything without JS. A real `<iframe>` is matched
// too, not to rebuild it but so a loader script beside it does not mint a second player.
const wistiaSelector = [
  '[class*="wistia_async_"]',
  'wistia-player[media-id]',
  'script[src*="/embed/medias/"]',
  'iframe[src*="wistia"]',
].join(', ')

// Both carry the media id in the src path.
const srcCarrierTags = new Set(['script', 'iframe'])

const readMediaId = (element: Element): string | undefined => {
  if (element.localName === 'wistia-player') {
    return attr(element, 'media-id')
  }

  if (srcCarrierTags.has(element.localName)) {
    return attr(element, 'src')?.match(scriptMediaPattern)?.[1]
  }

  return element.className.match(wistiaIdPattern)?.[1]
}

// Rebuilding a plain <iframe> from the id makes the embed render, and `wistiaEmbedResolver` then
// reads that same url and gives it a provider and an id. No thumbnail either way, since Wistia's
// poster needs the media JSON hop. The custom element's `aspect` is a bare decimal, so the ratio
// survives into the rebuilt iframe.
//
// A lone `<script>` is rebuilt only when nothing else on the page already names that media.
// Where a feed ships the loader beside the facade div (the common case), the div is the better
// carrier and the script would otherwise mint a duplicate player.
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

    if (!mediaId || !mediaIdRegex.test(mediaId)) {
      continue
    }

    if (element.localName === 'script' && carried.has(mediaId)) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', `https://fast.wistia.net/embed/iframe/${mediaId}`)

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
