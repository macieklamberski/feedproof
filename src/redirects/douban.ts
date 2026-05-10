import { createParamExtractor } from '../utils.js'

// Douban external link redirect (www.douban.com/link2/?url=<target>).
export const extractDouban = createParamExtractor({
  hosts: 'www.douban.com',
  path: '/link2/',
  params: ['url'],
})
