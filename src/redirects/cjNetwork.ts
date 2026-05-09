import { createParamExtractor } from '../utils.js'

// Commission Junction / CJ affiliate network redirects across rotating brand
// hostnames (?url=<target>).
export const extractCjNetwork = createParamExtractor({
  hosts: [
    'www.dpbolvw.net',
    'www.tkqlhce.com',
    'www.anrdoezrs.net',
    'www.jdoqocy.com',
    'www.kqzyfj.com',
    'www.pntrac.com',
    'www.pjtra.com',
    'www.pntrs.com',
  ],
  params: ['url'],
})
