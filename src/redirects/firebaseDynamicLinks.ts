import { createParamExtractor } from '../utils.js'

// Firebase Dynamic Links (<project>.page.link/?ofl=<target> — `ofl` is the
// fallback URL used when no app handler is available).
export const extractFirebaseDynamicLinks = createParamExtractor({
  hosts: /\.page\.link$/,
  params: ['ofl'],
})
