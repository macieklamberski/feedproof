import type { RedirectExtractor } from '../types.js'
import { createParamExtractor } from '../utils.js'

const baseExtractor = createParamExtractor({
  hosts: 'urldefense.proofpoint.com',
  path: '/v2/url',
  params: ['u'],
})

// Proofpoint URLDefense v2 (urldefense.proofpoint.com/v2/url?u=<encoded>). The
// encoded URL substitutes `_` for `/` and `-` for `%`, then is URL-decoded.
export const extractProofpointV2: RedirectExtractor = (url) => {
  const raw = baseExtractor(url)

  if (!raw) {
    return null
  }

  try {
    return decodeURIComponent(raw.replace(/-/g, '%').replace(/_/g, '/'))
  } catch {
    return null
  }
}
