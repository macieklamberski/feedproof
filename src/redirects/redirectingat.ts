import { createParamExtractor } from '../utils.js'

// Skimlinks family `redirectingat.com` affiliate redirect (?url=<target>).
export const extractRedirectingat = createParamExtractor({
  hosts: 'redirectingat.com',
  params: ['url'],
})
