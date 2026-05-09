import type { RedirectExtractor } from '../types.js'
import { createParamExtractor } from '../utils.js'

const baseExtractor = createParamExtractor({
  hosts: /\.acemln[a-d]\.com$/,
  path: '/Prod/link-tracker',
  params: ['redirectUrl'],
})

// ActiveCampaign ACEML link tracker (<host>.acemln[a-d].com/Prod/link-tracker
// ?redirectUrl=<base64>). The redirectUrl param is base64-encoded.
export const extractAceml: RedirectExtractor = (url) => {
  const raw = baseExtractor(url)

  if (!raw) {
    return null
  }

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded
    }
  } catch {}

  return null
}
