import { createParamExtractor } from '../utils.js'

// Zhihu external redirect (link.zhihu.com/?target=<target>).
export const extractZhihu = createParamExtractor({
  hosts: 'link.zhihu.com',
  params: ['target'],
})
