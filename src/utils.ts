import type { RedirectExtractor } from './types.js'

export const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

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

      if (isHttpUrl(resolved)) {
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

export type ParamExtractorConfig = {
  hosts: string | Array<string> | RegExp
  path?: string
  params: Array<string>
}

export const createParamExtractor = (config: ParamExtractorConfig): RedirectExtractor => {
  const matchesHost = (host: string): boolean => {
    if (config.hosts instanceof RegExp) {
      return config.hosts.test(host)
    }

    const list = Array.isArray(config.hosts) ? config.hosts : [config.hosts]

    return list.includes(host)
  }

  return (url) => {
    if (!matchesHost(url.hostname)) {
      return
    }

    if (config.path && url.pathname !== config.path) {
      return
    }

    for (const param of config.params) {
      const value = url.searchParams.get(param)

      if (value) {
        return value
      }
    }
  }
}
