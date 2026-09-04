import { parseUrl } from 'trousse'
import type { DomTransform } from '../../types.js'
import { isWhitespaceText } from '../../utils/dom.js'

const mediaSelector = 'img, picture, video, audio, iframe, svg'
const trailingSlashRegex = /\/$/

// Origin, path and query, with a trailing slash dropped so `/post` and `/post/` name the same
// page. Undefined for a fragment link, which points at a section of the page and not the page.
const getPageKey = (url: string): string | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || parsed.hash) {
    return
  }

  return `${parsed.origin}${parsed.pathname.replace(trailingSlashRegex, '')}${parsed.search}`
}

// The "Source", "Read more" or title link a feed appends to every item, which in a reader only
// points back at the page being read. Feeds label it in every language, so only the href decides.
export const stripSelfLinkParagraphs: DomTransform = ({ baseUrl, resolveUrlFn }) => {
  const selfKey = baseUrl ? getPageKey(baseUrl) : undefined

  if (!selfKey) {
    return () => {}
  }

  return (document) => {
    for (const anchor of document.querySelectorAll('p > a[href]')) {
      const paragraph = anchor.parentElement
      const href = anchor.getAttribute('href')

      if (!paragraph || !href) {
        continue
      }

      const hasOnlyAnchor = Array.from(paragraph.childNodes).every((node) => {
        return node === anchor || isWhitespaceText(node)
      })

      if (!hasOnlyAnchor || anchor.querySelector(mediaSelector)) {
        continue
      }

      const resolved = resolveUrlFn(href, baseUrl)

      if (!resolved || getPageKey(resolved) !== selfKey) {
        continue
      }

      paragraph.remove()
    }
  }
}
