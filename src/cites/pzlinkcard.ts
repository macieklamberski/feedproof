import { parseUrl } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// Pz-LinkCard is a widely used WordPress link-card plugin. Like Cocoon the whole card sits
// inside a wrapping anchor, so the url comes from the nearest ancestor `<a>` rather than a
// descendant. The favicon is the linked site's real favicon fetched through Google's
// service (`google.com/s2/favicons?domain=…`), so it is a usable icon, not decorative.
// The share-count block (`.lkc-share`) is dropped.
//
// Installs differ in three ways, all seen in live feeds, so each field is hedged:
// the title is either `.lkc-title` directly or nested in `.lkc-title-text`; the favicon
// class sits either on the `<img>` itself or on a wrapper `<div>` around it; and a card
// may have no wrapping anchor at all, printing the target in `.lkc-url` instead.
const findUrl = (element: Element): string | undefined => {
  const anchorUrl = attr(element.closest('a'), 'href')

  if (anchorUrl) {
    return anchorUrl
  }

  // Cards with no wrapping anchor print the target as text in `.lkc-url` instead, so it
  // has to parse as a URL before it is trusted as one — the same element also holds
  // dead-link notes on some installs.
  const printedUrl = text(element, '.lkc-url')

  if (printedUrl && parseUrl(printedUrl)) {
    return printedUrl
  }
}

export const pzlinkcardCiteResolver: CiteResolver = {
  selector: '.lkc-card',
  extract: (element) => {
    const favicon = find(element, '.lkc-favicon img') ?? find(element, '.lkc-favicon')

    return buildCite({
      provider: 'pzlinkcard',
      url: findUrl(element),
      title: text(element, '.lkc-title-text') ?? text(element, '.lkc-title'),
      description: text(element, '.lkc-excerpt'),
      publisher: text(element, '.lkc-domain'),
      icon: attr(favicon, 'src'),
      thumbnail: attr(find(element, '.lkc-thumbnail-img'), 'src'),
    })
  },
}
