import { createParamExtractor } from '../utils.js'

// smartredirect.de affiliate redirect (?url=<target>).
export const extractSmartredirect = createParamExtractor({
  hosts: 'smartredirect.de',
  params: ['url'],
})
