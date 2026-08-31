import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `lbry.tv` was the same site under its previous name and every one of its urls redirects to
// odysee.com with the path kept, so it is read the same way.
const odyseeHosts = ['odysee.com', 'lbry.tv']

// A claim is `{name}:{claim id}`, the id being a hex prefix of any length that disambiguates
// the name. A channel is the same with `@` in front. The name is whatever the publisher typed,
// so only what would break the minted path or smuggle a second url segment is refused.
//
// The claim id is optional: a bare name addresses the winning claim for it. Probed live
// 2026-08-31, a bare name returns the same player as the claim spelled with its short id,
// against a not-found shell for a name that does not exist. Both answer 200, so on this
// platform only the body separates a real claim from an invented one.
const claimRegex = /^@?[^\s/?#<>"'\\:]+(?::[0-9a-f]+)?$/i

// The player is `odysee.com/$/embed/{path}`, in 160 corpus feeds, and the path takes two
// spellings. The current share code writes the channel and the claim as two segments,
// `@channel:x/name:y`, and lately percent-encodes the whole path, `$` and `/` included, so
// the pathname is decoded before it is split. The older code, and the lbry.tv redirect,
// wrote the claim as `{name}/{claim id}` with a slash between the two halves. The same claim
// spelled `{name}:{claim id}` answers the same page (both forms checked live 2026-08-16), and
// that colon form is what odysee.com uses as the page path, so it is what the id is
// normalized to. The id is then the page path itself, which is what makes it self-sufficient
// for enrichment: `odysee.com/$/oembed?url=https://odysee.com/{id}` answers with the title,
// author and thumbnail and needs no key.
//
// The `r=` query is a referral token the share dialog appends and is dropped with the rest of
// the query. The thumbnail lives under a content hash the url does not carry.
const readClaimPath = (parsed: URL): string | undefined => {
  let pathname: string

  try {
    pathname = decodeURIComponent(parsed.pathname)
  } catch {
    return
  }

  const [marker, route, ...segments] = pathname.split('/').filter(Boolean)

  if (marker !== '$' || route !== 'embed') {
    return
  }

  const [first, second] = segments
  const isLegacyPair = segments.length === 2 && !first.includes(':')
  const claims = isLegacyPair ? [`${first}:${second}`] : segments

  if (
    claims.length === 0 ||
    claims.length > 2 ||
    !claims.every((claim) => claimRegex.test(claim))
  ) {
    return
  }

  // Two claims are only ever a channel followed by the claim inside it.
  if (claims.length === 2 && !claims[0]?.startsWith('@')) {
    return
  }

  return claims.join('/')
}

const odyseeResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')
  const claimPath = parsed ? readClaimPath(parsed) : undefined

  if (!claimPath) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider: 'odysee',
    id: claimPath,
    src: `https://odysee.com/$/embed/${claimPath}`,
    url: `https://odysee.com/${claimPath}`,
    title,
  }
}

export const odyseeEmbedResolver = createUrlEmbedResolver(odyseeHosts, odyseeResolveEmbed)
