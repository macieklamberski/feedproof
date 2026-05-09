import { createParamExtractor } from '../utils.js'

// ShareASale affiliate redirect (shareasale.com/r.cfm?urllink=<target>).
export const extractShareasale = createParamExtractor({
  hosts: 'shareasale.com',
  path: '/r.cfm',
  params: ['urllink'],
})
