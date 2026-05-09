import { createParamExtractor } from '../utils.js'

// Narrativ influencer-affiliate redirect (api.narrativ.com or narrativ.com with ?url=<target>).
export const extractNarrativ = createParamExtractor({
  hosts: ['narrativ.com', 'api.narrativ.com'],
  params: ['url'],
})
