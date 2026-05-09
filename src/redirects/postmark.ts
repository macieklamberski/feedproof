import type { RedirectExtractor } from '../types.js'

const postmarkPathRegex = /^\/[23][st]\/([^/]+)\//

// Postmark click-tracking redirect (click.pstmrk.it/<version><kind>/<encoded>/...).
// The version prefix is `2s`, `2t`, `3s`, or `3t`; the next segment carries
// the URL-encoded target.
export const extractPostmark: RedirectExtractor = (url) => {
  if (url.hostname !== 'click.pstmrk.it') {
    return null
  }

  const match = url.pathname.match(postmarkPathRegex)
  if (!match) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {}

  return null
}
