import type { Nullish, PartialNullish } from 'trousse'
import type { CiteResolverResult } from '../types.js'

// What a resolver scrapes: the result fields as the markup or the JSON blob carries them,
// untrimmed and nullish wherever the field is absent.
type RawCiteResult = PartialNullish<CiteResolverResult> & Pick<CiteResolverResult, 'provider'>

const trim = (value: Nullish<string>): string | undefined => {
  return value?.trim() || undefined
}

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
