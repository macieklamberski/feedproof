import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// lbry.tv and open.lbry.com redirect every url to odysee.com with the path kept.
const odyseeHosts = ['odysee.com', 'lbry.tv', 'open.lbry.com']

// A claim, `{name}:{hex claim id}`, with an optional leading `@` for a channel and an optional id.
// A bare name addresses the winning claim for it. The parser folds a bare .. segment away, and a
// path percent-encoded whole carries one past it.
const claimRegex = /^@?(?!\.+(?::|$))[^\s/?#<>"'\\:]+(?::[0-9a-f]+)?$/i

const readClaimPath = (parsed: URL): string | undefined => {
  let pathname: string

  // The current share code percent-encodes the whole path, $ and / included.
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
  // A leading `@` says the first segment is a channel and the second the claim inside it, so
  // the pair stays two claims even when neither carries an id. Only a bare first segment reads
  // as the legacy `{name}/{claim id}` spelling.
  const isLegacyPair = segments.length === 2 && !first.includes(':') && !first.startsWith('@')
  // odysee.com spells its page path {name}:{claim id}, and the player answers that form for a
  // legacy pair too.
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
  const parsed = parseUrl(link, placeholderBaseUrl)
  const claimPath = parsed ? readClaimPath(parsed) : undefined

  if (!claimPath) {
    return
  }

  const title = attr(element, 'title')
  // The channel is the first claim when the path names one, and the `@` is what marks it.
  // The claim id after the colon only disambiguates the name, so it is not part of the name.
  const [channel] = claimPath.split('/')
  const author = channel.startsWith('@') ? channel.split(':')[0] : undefined

  // odysee.com/$/oembed?url=https://odysee.com/{claim path} answers the title, author and thumbnail
  // without a key.
  return {
    provider: 'odysee',
    id: claimPath,
    src: `https://odysee.com/$/embed/${claimPath}`,
    url: `https://odysee.com/${claimPath}`,
    author,
    title,
  }
}

// The odysee.com/$/embed player, pasted under its former lbry.tv and open.lbry.com hosts too.
export const odyseeEmbedResolver = createUrlEmbedResolver(odyseeHosts, odyseeResolveEmbed)
