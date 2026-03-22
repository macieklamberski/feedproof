// Priority: item link → site URL → feed URL. Item content is authored relative to the
// item's page, so its link is the best base for resolving relative URLs in content.
export const chooseBaseUrl = (
  itemUrl: string | null | undefined,
  siteUrl: string | null | undefined,
  feedUrl: string,
): string | undefined => {
  const toHttpUrl = (url: string, base?: string): string | undefined => {
    try {
      const resolved = base ? new URL(url, base).href : url
      const { protocol } = new URL(resolved)

      if (protocol === 'http:' || protocol === 'https:') {
        return resolved
      }
    } catch {}
  }

  if (itemUrl && toHttpUrl(itemUrl)) {
    return itemUrl
  }

  if (siteUrl) {
    const resolved = toHttpUrl(siteUrl, feedUrl)

    if (resolved) {
      return resolved
    }
  }

  return toHttpUrl(feedUrl)
}

export const coerceNumber = (value: string | null): number | undefined => {
  if (value == null) {
    return
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? undefined : parsed
}
