import { createParamExtractor } from '../utils.js'

// Recruitics job-listings redirect (jsv3.recruitics.com/redirect?rx_url=<target>).
export const extractRecruitics = createParamExtractor({
  hosts: 'jsv3.recruitics.com',
  params: ['rx_url'],
})
