import type { DomTransform, UrlUnwrapper } from '../../types.js'

export const extractRedirectTarget = (
  url: URL,
  extractors: ReadonlyArray<UrlUnwrapper>,
): string | undefined => {
  for (const extractor of extractors) {
    const target = extractor(url)

    if (target) {
      return target
    }
  }
}

export const unwrapRedirectUrls: DomTransform = (context) => {
  return (document) => {
    const anchors = document.querySelectorAll('a[href]')
    const unwrappers = context.urlUnwrappers

    if (unwrappers.length === 0) {
      return
    }

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      try {
        const url = new URL(href)

        for (const unwrap of unwrappers) {
          const target = unwrap(url)

          if (target) {
            anchor.setAttribute('href', target)
            break
          }
        }
      } catch {}
    }
  }
}
