import { createParamExtractor } from '../utils.js'

// Tradedoubler affiliate redirect (clk.tradedoubler.com/click?url=<target>).
export const extractTradedoubler = createParamExtractor({
  hosts: 'clk.tradedoubler.com',
  path: '/click',
  params: ['url'],
})
