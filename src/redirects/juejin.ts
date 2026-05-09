import { createParamExtractor } from '../utils.js'

// Juejin external link redirect (link.juejin.cn/?target=<target>).
export const extractJuejin = createParamExtractor({
  hosts: 'link.juejin.cn',
  params: ['target'],
})
