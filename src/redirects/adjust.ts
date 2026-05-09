import { createParamExtractor } from '../utils.js'

// Adjust deep-link tracker (app.adjust.com/<token>?redirect=<target>).
export const extractAdjust = createParamExtractor({
  hosts: 'app.adjust.com',
  params: ['redirect'],
})
