import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const odyseeHosts = ['odysee.com', 'lbry.tv', 'open.lbry.com']

// A claim, `{name}:{hex claim id}`, with an optional leading `@` for a channel and an optional id.
const claimRegex = /^@?(?!\.+(?::|$))[^\s/?#<>"'\\:]+(?::[0-9a-f]+)?$/i

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
  const isLegacyPair = segments.length === 2 && !first.includes(':') && !first.startsWith('@')
  const claims = isLegacyPair ? [`${first}:${second}`] : segments

  if (
    claims.length === 0 ||
    claims.length > 2 ||
    !claims.every((claim) => claimRegex.test(claim))
  ) {
    return
  }

  if (claims.length === 2 && !claims[0]?.startsWith('@')) {
    return
  }

  return claims.join('/')
}

const odyseeResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)
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

// The odysee.com/$/embed player, pasted under its former lbry.tv and open.lbry.com hosts too.
export const odyseeEmbedResolver = createUrlEmbedResolver(odyseeHosts, odyseeResolveEmbed)
