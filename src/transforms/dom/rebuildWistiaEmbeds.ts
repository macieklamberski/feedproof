import type { DomTransform } from '../../types.js'

// Pulls the hashed id out of the `wistia_async_{id}` class the facade carries.
const wistiaIdPattern = /\bwistia_async_([A-Za-z0-9]+)/

// Wistia's JS-API inline embed is a `<div class="wistia_embed wistia_async_{id} ...">`
// (usually wrapped in `wistia_responsive_padding` / `wistia_responsive_wrapper` divs) with
// no iframe — JS builds the player on load. A reader runs no JS, so the video never
// appears. Rebuild a plain <iframe> from the id so the embed renders. feedsweep has no
// Wistia resolver, so this stays a raw iframe (a generic placeholder downstream, no
// thumbnail) — like the lite-vimeo case in rebuildLiteVideoEmbeds, still better than a
// dead facade a reader can't activate.
export const rebuildWistiaEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('[class*="wistia_async_"]')) {
    const match = element.className.match(wistiaIdPattern)
    const videoId = match?.[1]

    if (!videoId) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', `https://fast.wistia.net/embed/iframe/${videoId}`)

    // Replace the outermost Wistia wrapper so the padding/sizing divs go with it. The
    // padding div is the outer of the two, so prefer it; fall back to the wrapper, then
    // to the embed div when there is no responsive wrapper around it.
    const padding = element.closest('.wistia_responsive_padding')
    const wrapper = element.closest('.wistia_responsive_wrapper')
    const target = padding ?? wrapper ?? element
    target.replaceWith(iframe)
  }
}
