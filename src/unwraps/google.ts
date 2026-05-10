import { createParamExtractor } from '../utils.js'

const googleHostRegex = /^(?:www\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2,3})?)$/

// Google redirect (google.<TLD>/url?url=<target> or google.<TLD>/url?q=<target>).
export const unwrapGoogleUrl = createParamExtractor({
  hosts: googleHostRegex,
  path: '/url',
  params: ['url', 'q'],
})
