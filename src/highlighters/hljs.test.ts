import { describe, expect, it } from 'bun:test'
import { extraLanguages, hljsHighlightFn, languageAliases } from './hljs.js'

const registeredLanguages = Object.keys(extraLanguages)

// Flattened to one [alias, language] pair per alias, e.g. ['racket', 'scheme'].
const aliasPairs = Object.entries(languageAliases).flatMap(([language, aliases]) =>
  aliases.map((alias): [string, string] => [alias, language]),
)

// hljsHighlightFn returns undefined for an unregistered language, so a defined
// result proves the key resolves to a grammar. Iterates the real tables, so
// every entry is exercised and a new entry is covered automatically.
describe('hljsHighlightFn', () => {
  it.each(registeredLanguages)('should resolve the %s grammar', (language) => {
    expect(hljsHighlightFn('x', language)).toBeDefined()
  })

  it.each(aliasPairs)('should resolve the %s alias to %s', (alias) => {
    expect(hljsHighlightFn('x', alias)).toBeDefined()
  })

  it('should return undefined for an unknown language', () => {
    expect(hljsHighlightFn('x', 'not-a-language')).toBeUndefined()
  })
})
