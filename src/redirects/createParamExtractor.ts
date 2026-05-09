import type { RedirectExtractor } from '../types.js'

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
      return null
    }

    if (config.path && url.pathname !== config.path) {
      return null
    }

    for (const param of config.params) {
      const value = url.searchParams.get(param)

      if (value) {
        return value
      }
    }

    return null
  }
}
