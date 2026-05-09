import { createParamExtractor } from '../utils.js'

// Flipboard outbound redirect (flipboard.com/redirect?url=<target>).
export const extractFlipboard = createParamExtractor({
  hosts: 'flipboard.com',
  path: '/redirect',
  params: ['url'],
})
