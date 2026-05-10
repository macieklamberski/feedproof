import { createParamExtractor } from '../utils.js'

const googleTranslateHostRegex = /^translate\.google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2,3})?)$/

// Google Translate (translate.google.<TLD>/translate?u=<target>).
export const extractGoogleTranslateRedirect = createParamExtractor({
  hosts: googleTranslateHostRegex,
  path: '/translate',
  params: ['u'],
})
