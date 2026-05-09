import { createParamExtractor } from '../utils.js'

// Facebook link shim (l.facebook.com/l.php?u=<target>).
export const extractFacebookShim = createParamExtractor({
  hosts: ['l.facebook.com', 'lm.facebook.com'],
  path: '/l.php',
  params: ['u'],
})
