import { createParamExtractor } from '../utils.js'

// eBay Rover affiliate redirect (rover.ebay.<TLD>/...?mpre=<target>).
export const extractEbayRover = createParamExtractor({
  hosts: /^rover\.ebay\.[a-z.]+$/,
  params: ['mpre'],
})
