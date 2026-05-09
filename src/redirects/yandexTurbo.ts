import type { RedirectExtractor } from '../types.js'

const turbopagesHostRegex = /\.turbopages\.org$/
const turbopagesPathRegex = /^\/[^/]+\/s\/(.+)$/
const dashRegex = /-/g

// Yandex Turbo cached page (<source-host-with-dashes>.turbopages.org/<host>/s/<path>).
// The subdomain encodes the original host, replacing `.` with `-`; the path
// after `/s/` is the original path.
export const extractYandexTurbo: RedirectExtractor = (url) => {
  if (!turbopagesHostRegex.test(url.hostname)) {
    return null
  }

  const match = url.pathname.match(turbopagesPathRegex)
  if (!match) {
    return null
  }

  const sourceHost = url.hostname.replace(turbopagesHostRegex, '').replace(dashRegex, '.')

  return `https://${sourceHost}/${match[1]}`
}
