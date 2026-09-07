import type { DomTransform } from '../../types.js'
import { attr, keepIfMatches } from '../../utils/dom.js'
import { createImage } from '../../utils/widgets.js'

const customerIdRegex = /^[a-f0-9]{32}$/
const imageIdRegex = /^[A-Za-z0-9_-]+$/

// SmartFrame is an image-protection platform, so `<smartframe-embed>` is a custom element with
// no children: unupgraded it renders as nothing at all, and 56 of the 57 corpus feeds carrying
// one hold no SmartFrame image or frame anywhere else, so the picture is simply gone.
//
// The platform publishes the picture as an ordinary file all the same. `embed.js` falls back to
// an `<img>` on the thumbnail host whenever it cannot run its viewer, and SmartFrame's own
// WordPress plugin writes that same url into the feed for scrapers, alongside the element:
// `thumbs.smartframe.io/{customer}/{image}.webp`. Verified 2026-09-06: fourteen real pairs
// answer 200 `image/webp` with distinct byte counts, covering every id length the corpus holds
// from six characters to twenty, while a fabricated image id and a fabricated customer id both
// answer 404. So the derivation is checkable, which most platform hosts are not.
//
// No page url is minted with it. The element names none, and the share url the viewer builds is
// assembled from state the markup does not carry.
export const convertSmartframeEmbeds: DomTransform = () => (document) => {
  for (const embed of document.querySelectorAll('smartframe-embed[customer-id][image-id]')) {
    const customerId = keepIfMatches(attr(embed, 'customer-id'), customerIdRegex)
    const imageId = keepIfMatches(attr(embed, 'image-id'), imageIdRegex)

    if (!customerId || !imageId) {
      continue
    }

    const image = createImage(document, {
      src: `https://thumbs.smartframe.io/${customerId}/${imageId}.webp`,
    })

    embed.replaceWith(image)
  }
}
