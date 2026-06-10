import { resolveUrl } from 'feedcanon'

// Priority: item link → site URL → feed URL. Item content is authored relative to the
// item's page, so its link is the best base for resolving relative URLs in content.
export const chooseBaseUrl = (
  itemUrl: string | null | undefined,
  siteUrl: string | null | undefined,
  feedUrl: string,
): string | undefined => {
  if (itemUrl && resolveUrl(itemUrl)) {
    return itemUrl
  }

  if (siteUrl) {
    const resolved = resolveUrl(siteUrl, feedUrl)

    if (resolved) {
      return resolved
    }
  }

  return resolveUrl(feedUrl)
}

export const coerceNumber = (value: string | null): number | undefined => {
  if (value == null) {
    return
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? undefined : parsed
}
