import { createParamExtractor } from '../utils.js'

// Instagram outbound link shim (l.instagram.com or lm.instagram.com with ?u=<target>).
export const extractInstagramShim = createParamExtractor({
  hosts: ['l.instagram.com', 'lm.instagram.com'],
  params: ['u'],
})
