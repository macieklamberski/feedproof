import { getPathSegments, isHostOf, isPlainObject, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'codesandbox'

// `sse.codesandbox.io` serves a sandbox's running preview and `blog.codesandbox.io` the marketing
// blog, so only the bare host and its `www.` spelling name something embeddable. `isHostOf` and not
// `parseUrlOnHosts` for that reason: the latter admits every subdomain.
const codesandboxHosts = ['codesandbox.io', 'www.codesandbox.io']

// The slug in front of the hash is renamable, so only the hash identifies a sandbox. Letters and
// digits in both cases, and no length: the hash has run 5, 6, 9 and 10 characters across the
// corpus, and the Vue template sandbox is three (`/embed/vue` answers its own page, 2026-09-07).
const idRegex = /^[A-Za-z0-9]+$/

// Words CodeSandbox owns where a slug sits. `github` is the one that bites, being spelled in the
// hash's own alphabet. `new` opens a starter template with nothing saved behind it.
const reservedSlugSegments = new Set(['github', 'github.com', 'fork', 'new'])

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

export const codesandboxIframeEmbedResolver = createUrlEmbedResolver(
  ['codesandbox.io'],
  codesandboxResolveEmbed,
)

// The editor posts its rendered height unasked, as `{ src, context: 'iframe.resize', height }`,
// so there is nothing to request: a reader that listens gets the box the sandbox actually needs
// instead of the 500 stated above. Verified in a browser on 2026-09-07, where one sandbox
// reported 564 and then 664 as it settled.
//
// The origin is spelled out rather than left to the frame's own, which is the trap here. The src
// is the publisher's url whole, and `www.codesandbox.io` is a spelling this resolver accepts; it
// 301s to the apex, so the frame's `src` would say `www` while every message arrives from
// `https://codesandbox.io` and a reader matching the two would drop them all.
//
// A publisher who wrote no `autoresize=1` gets a constant 500 rather than the content height,
// which is the height already stated, so the hint is worth having either way.
export const readCodesandboxHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.context === 'iframe.resize'
    ? readPixels(data.height)
    : undefined
}

export const codesandboxRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://codesandbox.io',
  readHeight: readCodesandboxHeight,
}
