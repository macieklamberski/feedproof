import type { DomTransform, RedirectExtractor } from '../../types.js'

export const extractRedirectTarget = (
  url: URL,
  extractors: ReadonlyArray<RedirectExtractor>,
): string | null => {
  for (const extractor of extractors) {
    const target = extractor(url)

    if (target) {
      return target
    }
  }

  return null
}

export const unwrapRedirectUrls: DomTransform = (context) => {
  const extractors = context.redirectExtractors ?? []

  return (document) => {
    const anchors = document.querySelectorAll('a[href]')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      try {
        const url = new URL(href)

        for (const extractor of extractors) {
          const target = extractor(url)

          if (target) {
            anchor.setAttribute('href', target)
            break
          }
        }
      } catch {}
    }
  }
}
