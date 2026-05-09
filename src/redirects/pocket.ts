import { createParamExtractor } from './createParamExtractor.js'

// Pocket redirect (getpocket.com/redirect?url=<target>).
export const extractPocketRedirect = createParamExtractor({
  hosts: 'getpocket.com',
  path: '/redirect',
  params: ['url'],
})
