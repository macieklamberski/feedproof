import { createParamExtractor } from '../utils.js'

// Mailchimp click tracker (<list>.mailchimp.com/mctx/clicks?url=<target>).
export const extractMailchimp = createParamExtractor({
  hosts: /\.mailchimp\.com$/,
  path: '/mctx/clicks',
  params: ['url'],
})
