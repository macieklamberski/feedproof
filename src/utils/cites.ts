import type { Nullish } from 'trousse'
import type { CiteResolverResult } from '../types.js'

// What a resolver scrapes: the result shape, but with values as the markup or the JSON blob
// carries them — untrimmed, and nullish wherever the field is absent.
export type RawCiteResult = {
  [Key in keyof CiteResolverResult]?: Nullish<CiteResolverResult[Key]>
} & { provider: string }

// Every resolver ends the same way, so the shared rules live here rather than in each one: a
// card without a url or a title has nothing to render, and every value is trimmed, with the
// blanks that leaves dropped.
export const buildCite = (result: RawCiteResult): CiteResolverResult | undefined => {
  const url = result.url?.trim()
  const title = result.title?.trim()

  if (!url || !title) {
    return
  }

  const trimmed = Object.entries(result).map(([key, value]) => {
    return [key, typeof value === 'string' ? value.trim() || undefined : (value ?? undefined)]
  })

  return { ...Object.fromEntries(trimmed), url, title } as CiteResolverResult
}
