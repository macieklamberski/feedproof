import { createParamExtractor } from '../utils.js'

// Campaign Monitor / mailpgn email tracker (t.mailpgn.com/l/?fl=<target>).
export const extractMailpgn = createParamExtractor({
  hosts: 't.mailpgn.com',
  params: ['fl'],
})
