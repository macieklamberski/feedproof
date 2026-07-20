import type { Nullish } from 'trousse'
import type { CiteKind, CiteResolverResult } from '../types.js'

// What a resolver scrapes: the result fields as the markup or the JSON blob carries them,
// untrimmed and nullish wherever the field is absent.
export type RawCiteResult = {
  provider: string
  url?: Nullish<string>
  title?: Nullish<string>
  description?: Nullish<string>
  caption?: Nullish<string>
  author?: Nullish<string>
  publisher?: Nullish<string>
  date?: Nullish<string>
  icon?: Nullish<string>
  thumbnail?: Nullish<string>
  kind?: Nullish<CiteKind>
}

const trim = (value: Nullish<string>): string | undefined => {
  return value?.trim() || undefined
}

// Every resolver ends the same way, so the shared rules live here rather than in each one: a
// card without a url or a title has nothing to render, and every value is trimmed, with the
// blanks that leaves dropped.
export const buildCite = (result: RawCiteResult): CiteResolverResult | undefined => {
  const url = trim(result.url)
  const title = trim(result.title)

  if (!url || !title) {
    return
  }

  return {
    provider: result.provider,
    url,
    title,
    description: trim(result.description),
    caption: trim(result.caption),
    author: trim(result.author),
    publisher: trim(result.publisher),
    date: trim(result.date),
    icon: trim(result.icon),
    thumbnail: trim(result.thumbnail),
    kind: result.kind ?? undefined,
  }
}
