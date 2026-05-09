import { isSubdomainOf } from 'feedscout/utils'
import type { RedirectExtractor } from '../types.js'

// Outlook SafeLinks (<tenant>.safelinks.protection.outlook.com/?url=<target>).
export const extractOutlookSafelinks: RedirectExtractor = (url) => {
  if (isSubdomainOf(url.href, 'safelinks.protection.outlook.com')) {
    return url.searchParams.get('url') ?? null
  }

  return null
}
