import { createParamExtractor } from '../utils.js'

// Outlook SafeLinks (<tenant>.safelinks.protection.outlook.com/?url=<target>).
export const extractOutlookSafelinks = createParamExtractor({
  hosts: /\.safelinks\.protection\.outlook\.com$/,
  params: ['url'],
})
