import { isNonEmptyString, isNumber } from 'trousse'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'

// Substack ships an inline @-mention as an empty <span class="mention-wrap"> whose person
// or publication lives only in the data-attrs JSON, so the name vanishes mid-sentence in a
// reader. Rebuild the anchor: a publication mention carries its url in the payload, a user
// mention carries url: null and its numeric id mints a profile url that Substack redirects
// to the canonical handle.
type MentionAttrs = {
  name?: string
  id?: number
  url?: string | null
}

export const fixSubstackMentions: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('span.mention-wrap')) {
    const attrs = jsonAttr<MentionAttrs>(element, 'data-attrs')

    if (!attrs || !isNonEmptyString(attrs.name)) {
      continue
    }

    let url: string | undefined

    // The id lands in a url template, so anything that is not the positive integer Substack
    // emits is dropped.
    if (isNonEmptyString(attrs.url) && isUrlShaped(attrs.url)) {
      url = attrs.url
    } else if (isNumber(attrs.id) && Number.isInteger(attrs.id) && attrs.id > 0) {
      url = `https://substack.com/profile/${attrs.id}`
    }

    if (url) {
      const anchor = document.createElement('a')
      anchor.setAttribute('href', url)
      anchor.textContent = `@${attrs.name}`
      element.replaceWith(anchor)
    } else {
      element.replaceWith(document.createTextNode(`@${attrs.name}`))
    }
  }
}
