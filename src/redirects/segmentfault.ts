import type { RedirectExtractor } from '../types.js'
import { createParamExtractor } from '../utils.js'

const baseExtractor = createParamExtractor({
  hosts: 'link.segmentfault.com',
  params: ['enc'],
})

// Segmentfault external link redirect (link.segmentfault.com/?enc=<base64>).
// The enc param is a base64-encoded target URL.
export const extractSegmentfault: RedirectExtractor = (url) => {
  const raw = baseExtractor(url)

  if (!raw) {
    return
  }

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded
    }
  } catch {}

  return
}
