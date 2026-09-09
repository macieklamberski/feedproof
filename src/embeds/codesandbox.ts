import { getPathSegments, isHostOf, isPlainObject, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'codesandbox'

// Listed exactly, not by subdomain: sse.codesandbox.io and blog.codesandbox.io name no sandbox.
const codesandboxHosts = ['codesandbox.io', 'www.codesandbox.io']

const idRegex = /^[A-Za-z0-9]+$/

const reservedSlugSegments = new Set(['github', 'github.com', 'fork', 'new'])

const defaultSandboxHeight = 500

type CodesandboxTarget = {
  slug: string
  id: string
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

  const title = attr(element, 'title') || undefined

  return {
    provider,
    id: target.id,
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
