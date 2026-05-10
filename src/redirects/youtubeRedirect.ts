import { createParamExtractor } from '../utils.js'

// YouTube external redirect (www.youtube.com/redirect?q=<target>).
export const extractYouTubeRedirect = createParamExtractor({
  hosts: 'www.youtube.com',
  path: '/redirect',
  params: ['q'],
})
