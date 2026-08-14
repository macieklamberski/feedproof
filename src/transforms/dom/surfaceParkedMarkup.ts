import type { DomTransform } from '../../types.js'

const httpUrlRegex = /^https?:\/\//i

// Whether the recovered markup names an address of its own, in any attribute. Anything the
// downstream passes can resolve, link or placeholder is an http(s) URL in some attribute, and
// which attribute it is differs per platform, so every one is read rather than a listed few.
const hasStatedUrl = (holder: Element): boolean => {
  for (const element of holder.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      if (httpUrlRegex.test(attribute.value)) {
        return true
      }
    }
  }

  return false
}

// A lazy loader replaces every third-party embed with `<div class="load-later" data-url data-content>`
// and rebuilds it on scroll. A reader runs no JS, so the div renders nothing, and because it holds
// no text either, stripEmptyTags deletes it and the embed reaches a reader as nothing at all.
//
// `data-content` is the complete original element, percent-encoded: the YouTube iframe with its
// size and player parameters, the tweet blockquote with its text, author and date, the TikTok and
// Instagram quotes with their captions. Decoding it restores exactly the markup each resolver and
// each cite pass is already written against, so the container is dissolved into what it holds and
// nothing here knows which platform that turns out to be.
//
// The decoded string still carries HTML entities in its attribute values, so it goes back through
// the parser rather than being read with a regex.
export const surfaceParkedMarkup: DomTransform = () => (document) => {
  for (const container of document.querySelectorAll('div.load-later[data-content]')) {
    const encoded = container.getAttribute('data-content')

    if (!encoded) {
      continue
    }

    let markup: string

    try {
      markup = decodeURIComponent(encoded)
    } catch {
      continue
    }

    const holder = document.createElement('div')
    holder.innerHTML = markup

    // The container states the embed's address as well as its markup. When the parked element was
    // itself stripped of every link, that address is the only thing left to reach the post by.
    const url = container.getAttribute('data-url')

    if (url && httpUrlRegex.test(url) && !hasStatedUrl(holder)) {
      const link = document.createElement('a')

      link.setAttribute('href', url)
      link.textContent = url
      holder.appendChild(link)
    }

    container.replaceWith(...Array.from(holder.childNodes))
  }
}
