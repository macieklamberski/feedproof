import { getPathSegments, isHostOf, isPlainObject, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'codesandbox'

// Listed exactly, not by subdomain: sse.codesandbox.io and blog.codesandbox.io name no sandbox.
const codesandboxHosts = ['codesandbox.io', 'www.codesandbox.io']

// No length bound: hashes run 3 to 10 characters, and `/embed/vue` is a real sandbox.
const idRegex = /^[A-Za-z0-9]+$/

// Words CodeSandbox owns where a slug sits. `github` is the one that bites, being spelled in the
// hash's own alphabet. `new` opens a starter template with nothing saved behind it.
// `/embed/github/…` carries no hash and meets a Cloudflare challenge on every server-side
// request.
const reservedSlugSegments = new Set(['github', 'github.com', 'fork', 'new'])

// A height, not a ratio: the editor fills any box, and an unsized frame renders 150 tall.
// The share dialog writes 500.
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

// The slug in front of the hash is renamable, so only the hash identifies a sandbox.
const readId = (slug: string): string | undefined => {
  const id = slug.slice(slug.lastIndexOf('-') + 1)

  return idRegex.test(id) ? id : undefined
}

const parseTarget = (value: string | undefined): CodesandboxTarget | undefined => {
  const parsed = parseUrl(value ?? '', placeholderBaseUrl)

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

  // The sandbox's own name, which is what the share dialog writes and what a rendered DEV.to or
  // Hashnode embed carries. `title` on the carrier is the only place a sandbox names itself
  // offline.
  const title = attr(element, 'title') || undefined

  return {
    provider,
    id: target.id,
    // The publisher's url whole: their query is what opens the editor on the file and the pane they
    // meant, and CodeSandbox serves every one of these routes as a player.
    src: url,
    url: `https://codesandbox.io/${target.pagePath}`,
    height: defaultSandboxHeight,
    ...trimObject({ title }, Boolean),
  }
}

// CodeSandbox's editor iframe, under /embed/, /s/ or the DevBox-era /p/ routes.
export const codesandboxIframeEmbedResolver = createUrlEmbedResolver(
  ['codesandbox.io'],
  codesandboxResolveEmbed,
)

// The editor posts its rendered height unasked, as `{ src, context: 'iframe.resize', height }`.
// Without `autoresize=1` in the query it posts a constant 500.
export const readCodesandboxHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.context === 'iframe.resize'
    ? readPixels(data.height)
    : undefined
}

export const codesandboxRenderHint: EmbedRenderHint = {
  provider,
  // Spelled out: a `www.` src 301s to the apex, so every message arrives from here.
  origin: 'https://codesandbox.io',
  readHeight: readCodesandboxHeight,
}
