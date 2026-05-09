import { createParamExtractor } from '../utils.js'

// Skimlinks affiliate redirect (go.skimresources.com/?url=<target>).
export const extractSkimlinks = createParamExtractor({
  hosts: 'go.skimresources.com',
  params: ['url'],
})
