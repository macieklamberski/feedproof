import { createParamExtractor } from '../utils.js'

// Telegram Instant View (t.me/iv?url=<target>&rhash=<hash>).
export const extractTelegramIv = createParamExtractor({
  hosts: 't.me',
  path: '/iv',
  params: ['url'],
})
