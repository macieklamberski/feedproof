import type { BookmarkResolver } from '../types.js'

// Tistory renders a pasted link as a card built from the linked page's Open Graph tags.
// The `data-og-*` attribute names and the `og-*` class names below are Tistory's, but they
// map straight onto the Open Graph protocol (https://ogp.me): `og:title`, `og:description`,
// `og:image`, `og:url`. Tistory has simply frozen the page's OG metadata into the post at
// publish time instead of leaving it in the linked page's <head>.
//
// Every field is duplicated: once as a `data-og-*` attribute on the wrapper and once as an
// element inside the anchor. The attributes are read first because the elements are absent
// on the slimmer card variants.
export const tistoryBookmarkResolver: BookmarkResolver = {
  selector: '[data-og-source-url]',
  extract: (element) => {
    // `data-og-source-url` is the link the author added, which is what the card's own
    // anchor points at; `data-og-url` is the canonical target it resolves to.
    const url =
      element.getAttribute('data-og-source-url') ??
      element.getAttribute('data-og-url') ??
      element.querySelector('a')?.getAttribute('href') ??
      undefined
    const attributeTitle = element.getAttribute('data-og-title')?.trim()
    const title = attributeTitle || element.querySelector('.og-title')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    // A card can list several candidate images in one attribute, comma separated.
    const images = element.getAttribute('data-og-image')?.split(',')
    const thumbnail = images?.[0]?.trim()

    return {
      provider: 'tistory',
      url,
      title,
      description:
        element.getAttribute('data-og-description') ??
        element.querySelector('.og-desc')?.textContent ??
        undefined,
      publisher:
        element.getAttribute('data-og-host') ??
        element.querySelector('.og-host')?.textContent ??
        undefined,
      thumbnail: thumbnail || undefined,
    }
  },
}
