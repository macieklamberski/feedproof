import { createParamExtractor } from '../utils.js'

// Mailpanion email click tracker (mailpanion.com/?destination=<target>).
export const extractMailpanion = createParamExtractor({
  hosts: 'mailpanion.com',
  params: ['destination'],
})
