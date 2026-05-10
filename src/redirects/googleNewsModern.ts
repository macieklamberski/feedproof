import { isHostOf } from 'feedscout/utils'
import type { RedirectExtractor } from '../types.js'

// Google News modern article URLs (news.google.com/articles/<base64> or
// /rss/articles/<base64>). The article id is a base64url-encoded protobuf
// containing the destination URL between known framing bytes. Some ids
// (typically post-2023) require a server-side signature exchange and can
// only be resolved with a network call — those return undefined silently.
export const extractGoogleNewsModern: RedirectExtractor = (url) => {
  if (!isHostOf(url.href, 'news.google.com')) {
    return
  }

  const match = url.pathname.match(/^\/(?:rss\/)?articles\/([\w-]+)/)
  if (!match) {
    return
  }

  const padded = match[1].replace(/-/g, '+').replace(/_/g, '/')
  const decoded = Buffer.from(padded, 'base64').toString('latin1')
  const inner = decoded.match(/\x08\x13".+?(https?:\/\/[^\xd2]+)\xd2\x01/)

  return inner?.[1]
}
