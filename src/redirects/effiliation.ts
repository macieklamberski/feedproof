import { createParamExtractor } from '../utils.js'

// Effiliation French affiliate network (?url=<target>).
export const extractEffiliation = createParamExtractor({
  hosts: /\.effiliation\.com$/,
  params: ['url'],
})
