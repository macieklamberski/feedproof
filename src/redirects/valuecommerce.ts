import { createParamExtractor } from '../utils.js'

// ValueCommerce affiliate redirect (ck.jp.ap.valuecommerce.com/servlet/referral?vc_url=<target>).
export const extractValuecommerce = createParamExtractor({
  hosts: 'ck.jp.ap.valuecommerce.com',
  path: '/servlet/referral',
  params: ['vc_url'],
})
