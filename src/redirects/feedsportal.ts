import type { RedirectExtractor } from '../types.js'

// FeedSportal-encoded article links (<host>/<encoded-id>/story01.htm). The
// id uses '0' as a digraph prefix; each '0X' (X = A-Z) decodes to a fixed
// substitution. FeedSportal shut down around 2016 but archived feeds still
// contain these wrappers.
const ALPHABET: Record<string, string> = {
  A: '0', B: '.', C: '/', D: '?', E: '-', F: '=', G: '&', H: ',',
  I: '_', J: '%', K: '+', L: 'http://', M: 'https://', N: '.com',
  O: '.co.uk', P: ';', Q: '|', R: ':', S: 'www.', T: '#', U: '$',
  V: '~', W: '!', X: '(', Y: ')', Z: 'Z',
}
const FEEDSPORTAL_PATH = /\/([0-9A-Za-z]{20,})\/story01\.htm$/

export const extractFeedsportal: RedirectExtractor = (url) => {
  const match = url.pathname.match(FEEDSPORTAL_PATH)
  if (!match) {
    return null
  }

  const decoded = match[1]
    .split('0')
    .map((chunk, index) => {
      if (index === 0) {
        return chunk
      }
      const head = chunk[0]
      const substitution = head ? ALPHABET[head] : undefined
      return substitution === undefined ? `0${chunk}` : substitution + chunk.slice(1)
    })
    .join('')

  if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
    return null
  }

  return decoded
}
