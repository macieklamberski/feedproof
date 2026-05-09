import { createParamExtractor } from '../utils.js'

// Tumblr outbound redirect (t.umblr.com/redirect?z=<target>).
export const extractTumblr = createParamExtractor({
  hosts: 't.umblr.com',
  path: '/redirect',
  params: ['z'],
})
