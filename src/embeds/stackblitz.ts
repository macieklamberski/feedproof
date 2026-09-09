import { getPathSegments, isHostOf, parseUrl, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isFileName, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const stackblitzHosts = ['stackblitz.com', 'www.stackblitz.com']

const slugRegex = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const defaultProjectHeight = 500

type StackblitzTarget = {
  id: string
  query: string
}

const parseTarget = (value: string | undefined): StackblitzTarget | undefined => {
  const parsed = parseUrl(value ?? '', placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, stackblitzHosts)) {
    return
  }

  const [first, second] = getPathSegments(parsed)

  if ((first !== 'edit' && first !== 'run') || !second || !slugRegex.test(second)) {
    return
  }

  if (isFileName(second)) {
    return
  }

  return { id: second, query: parsed.search }
}

// StackBlitz's editor iframe, whose retired /run/{slug} route answers 404 while /edit/ serves.
export const stackblitzResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  if (!target) {
    return
  }

  const title = attr(element, 'title') || undefined
  const project = `https://stackblitz.com/edit/${target.id}`

  return {
    provider: 'stackblitz',
    id: target.id,
    src: `${project}${target.query}`,
    url: project,
    height: defaultProjectHeight,
    ...trimObject({ title }, Boolean),
  }
}

export const stackblitzIframeEmbedResolver = createUrlEmbedResolver(
  ['stackblitz.com'],
  stackblitzResolveEmbed,
)
