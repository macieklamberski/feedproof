import type { DomTransform } from '../../types.js'
import { attr, hasText } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

// note.com ships each embed as an empty <figure> only its web client hydrates.
// It names the target in data-src, and a uuid in name and id keeps stripEmptyTags off it.
export const convertNoteEmbeds: DomTransform = () => (document) => {
  // embedded-service is only matched on: the same platform lands in different values by url shape.
  // An Instagram post arrives as oembed and an Instagram reel as external-article.
  for (const element of document.querySelectorAll('figure[embedded-service][data-src]')) {
    const source = attr(element, 'data-src')

    // No resolver-registry check on the url: adventar.org frames fine and no resolver claims it.
    if (!source || !isUrlShaped(source)) {
      continue
    }

    // A figure already holding markup is showing the reader something, which is how an
    // `external-article` card arrives, so only an empty one is worth replacing.
    if (element.firstElementChild || hasText(element)) {
      continue
    }

    // data-src is always a canonical page url, never a player. YouTube, X, TikTok, Instagram and
    // stand.fm answer SAMEORIGIN or DENY for theirs, so only a resolver minting the player url
    // from the page url makes the figure watchable.
    const iframe = createIframe(document, source)
    element.replaceWith(iframe)
  }
}
