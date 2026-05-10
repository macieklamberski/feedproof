import { createParamExtractor } from '../utils.js'

// Pocket redirect (getpocket.com/redirect?url=<target>).
export const unwrapPocketUrl = createParamExtractor({
  hosts: 'getpocket.com',
  path: '/redirect',
  params: ['url'],
})
