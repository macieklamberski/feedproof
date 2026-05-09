import type { RedirectExtractor } from '../types.js'

const v3PathRegex = /^\/v3\/__(.+)__;([^!]*)!/
const v3HostSet = new Set(['urldefense.com', 'urldefense.proofpoint.com', 'urldefense.us'])

// `**X` runs replace a fixed byte count: A=2, B=3, ... `_`=65.
const runLengthMap: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  for (let index = 0; index < alphabet.length; index += 1) {
    map[alphabet[index]] = index + 2
  }
  return map
})()

const decodeReplacements = (mangled: string, replacementBase64: string): string | null => {
  if (replacementBase64.length === 0) {
    return mangled
  }

  let padded = replacementBase64
  while (padded.length % 4 !== 0) {
    padded += '='
  }

  let replacement: string
  try {
    replacement = Buffer.from(padded, 'base64url').toString('utf-8')
  } catch {
    return null
  }

  const replacementChars = Array.from(replacement)
  const urlChars = Array.from(mangled)
  const result: Array<string> = []
  const matcher = /(?<!\*)\*(?!\*)|\*{2}[A-Za-z0-9\-_]/g

  let lastIndex = 0
  let savedBytes = 0
  let match: RegExpExecArray | null

  match = matcher.exec(mangled)
  while (match !== null) {
    const startChar = positionInChars(mangled, match.index)
    const endChar = positionInChars(mangled, match.index + match[0].length)

    for (let charIndex = lastIndex; charIndex < startChar; charIndex += 1) {
      result.push(urlChars[charIndex])
    }

    if (match[0] === '*') {
      const next = replacementChars.shift()
      if (next === undefined) {
        return null
      }
      result.push(next)
    } else {
      let bytesToReplace = runLengthMap[match[0][2]]
      if (bytesToReplace === undefined) {
        return null
      }
      if (savedBytes !== 0) {
        bytesToReplace += savedBytes
        savedBytes = 0
      }

      let bytesConsumed = 0
      while (bytesConsumed < bytesToReplace) {
        const next = replacementChars.shift()
        if (next === undefined) {
          return null
        }
        result.push(next)
        bytesConsumed += Buffer.byteLength(next, 'utf-8')

        if (replacementChars.length > 0) {
          const peekSize = Buffer.byteLength(replacementChars[0], 'utf-8')
          if (peekSize > bytesToReplace - bytesConsumed) {
            savedBytes = bytesToReplace - bytesConsumed
            bytesConsumed += savedBytes
          }
        }
      }
    }

    lastIndex = endChar
    match = matcher.exec(mangled)
  }

  for (let charIndex = lastIndex; charIndex < urlChars.length; charIndex += 1) {
    result.push(urlChars[charIndex])
  }

  return result.join('')
}

// Convert a byte/code-unit offset from the source string into an index into
// the array-of-code-points view. Mangled v3 segments are ASCII-only at the
// `*` markers, so this is effectively the identity but keeps the algorithm
// safe for any embedded multi-byte literals in the URL itself.
const positionInChars = (source: string, codeUnitIndex: number): number => {
  let charIndex = 0
  let unit = 0
  while (unit < codeUnitIndex && unit < source.length) {
    const codePoint = source.codePointAt(unit)
    unit += codePoint !== undefined && codePoint > 0xffff ? 2 : 1
    charIndex += 1
  }
  return charIndex
}

// Proofpoint URLDefense v3 (urldefense.com/v3/__<mangled>__;<b64>!!<sig>$).
// `*` characters in the mangled URL are restored from the base64 segment;
// `**X` runs restore a fixed byte count (A=2 through `_`=65).
export const extractProofpointV3: RedirectExtractor = (url) => {
  if (!v3HostSet.has(url.hostname)) {
    return null
  }

  const match = `${url.pathname}${url.search}`.match(v3PathRegex)
  if (!match) {
    return null
  }

  return decodeReplacements(match[1], match[2])
}
