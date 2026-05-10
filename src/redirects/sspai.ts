import { createParamExtractor } from '../utils.js'

// Sspai external link redirect (sspai.com/link?target=<target>).
export const extractSspai = createParamExtractor({
  hosts: 'sspai.com',
  path: '/link',
  params: ['target'],
})
