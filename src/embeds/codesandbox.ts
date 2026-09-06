import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `sse.codesandbox.io` serves a sandbox's running preview and `blog.codesandbox.io` the marketing
// blog, so only the bare host and its `www.` spelling name something embeddable. `isHostOf` and not
// `parseUrlOnHosts` for that reason: the latter admits every subdomain.
const codesandboxHosts = ['codesandbox.io', 'www.codesandbox.io']

// The slug in front of the hash is renamable, so only the hash identifies a sandbox. Across 165
// sandbox urls mined from corpus specimens it runs 5 characters (73), 6 (61), 10 (27) or 9 (4),
// mixed case only in the 9-character era.
const idRegex = /^[A-Za-z0-9]{5,10}$/

// Words CodeSandbox owns where a slug sits. `github` is the one that bites, being six lowercase
// alphanumerics that pass the id test on length alone. `new` opens a starter template with nothing
// saved behind it, which is what the id bound refuses the shorter template names like `vue` for too.
const reservedSlugSegments = new Set(['github', 'github.com', 'fork', 'new'])

// The sandbox's own name, which is what the share dialog writes and what a rendered DEV.to or
// Hashnode embed carries. `title` on the carrier is the only place a sandbox names itself offline.
const readTitle = (element: Element | undefined): string | undefined => {
  return attr(element, 'title') || undefined
}

// What the share dialog writes and what 86 of 90 corpus iframes carry. A fixed height and not a
// ratio: an unsized embed measured 150 at both 500 and 1000 pixels wide, the HTML default, because
// the editor fills whatever box it is handed rather than reporting one.
const defaultSandboxHeight = 500

type CodesandboxTarget = {
  // The path segment the publisher wrote, hash and slug together. Kept whole because the page url
  // takes it as written and both spellings resolve.
  slug: string
  id: string
  // Where a reader goes when they click through. `/p/…` carriers already name their own page, so
  // only the `/embed/` and `/s/` forms are rewritten onto the `/s/{slug}` route CodeSandbox
  // declares canonical in its own `og:url`.
  pagePath: string
}

const readId = (slug: string): string | undefined => {
  const id = slug.slice(slug.lastIndexOf('-') + 1)

  return idRegex.test(id) ? id : undefined
}

const parseTarget = (value: string | undefined): CodesandboxTarget | undefined => {
  const parsed = parseUrl(value ?? '', 'https://example.com')

  if (!parsed || !isHostOf(parsed, codesandboxHosts)) {
    return
  }

  const [first, second, third] = getPathSegments(parsed)
  // `/embed/{slug}` is the embed renderer and `/s/{slug}` the legacy user url, which CodeSandbox
  // rewrites to the renderer when it is framed. `/p/sandbox/` and `/p/devbox/` are the DevBox-era
  // routes, which take `?embed=1` on the page's own address.
  const isProject = first === 'p' && (second === 'sandbox' || second === 'devbox')
  const isPlayer = first === 'embed' || first === 's'
  let slug: string | undefined

  if (isProject) {
    slug = third
  } else if (isPlayer) {
    slug = second
  }

  // `/embed/github/{owner}/{repo}/…` embeds a repository rather than a sandbox. It carries no hash,
  // so there is no id to key enrichment on, and CodeSandbox answers a Cloudflare challenge to every
  // server-side request for that path, so nothing could read it anyway. Left to the generic
  // fallback, which already renders it with the height the publisher stated.
  if (!slug || reservedSlugSegments.has(slug.toLowerCase())) {
    return
  }

  const id = readId(slug)

  if (!id) {
    return
  }

  return { slug, id, pagePath: isProject ? `p/${second}/${slug}` : `s/${slug}` }
}

export const codesandboxResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  if (!target) {
    return
  }

  const title = readTitle(element)

  return {
    provider: 'codesandbox',
    id: target.id,
    // The publisher's url whole: their query is what opens the editor on the file and the pane they
    // meant, and CodeSandbox serves every one of these routes as a player.
    src: url,
    url: `https://codesandbox.io/${target.pagePath}`,
    height: defaultSandboxHeight,
    ...(title && { title }),
  }
}

export const codesandboxIframeEmbedResolver = createUrlEmbedResolver(
  ['codesandbox.io'],
  codesandboxResolveEmbed,
)
