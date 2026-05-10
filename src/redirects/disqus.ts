import { createParamExtractor } from '../utils.js'

// Disqus outbound link redirect (disq.us/?url=<target>).
export const extractDisqus = createParamExtractor({
  hosts: 'disq.us',
  params: ['url'],
})
