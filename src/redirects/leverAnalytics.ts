import { createParamExtractor } from '../utils.js'

// Lever Analytics email click tracker (t.lever-analytics.com/...?dest=<target>).
export const extractLeverAnalytics = createParamExtractor({
  hosts: 't.lever-analytics.com',
  params: ['dest'],
})
