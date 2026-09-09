import { getPathSegments, isHostOf, parseUrl, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isFileName, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `blog.stackblitz.com` and `developer.stackblitz.com` are prose, and a project's running preview
// lives on `*.stackblitz.io`, so only the bare host and its `www.` spelling name a project.
const stackblitzHosts = ['stackblitz.com', 'www.stackblitz.com']

// A project is addressed by its own slug, and hyphens and dots are both legal in it:
// `vitejs-vite-jfnozz`, `angular-ivy-snow`.
const slugRegex = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

// What the share dialog writes beside `width="100%"`.
const defaultProjectHeight = 500

type StackblitzTarget = {
  id: string
  // The query the publisher chose, which selects the open file, the pane and the theme. Carried
  // across when `/run/` is rewritten so the repair keeps their layout.
  query: string
}

const parseTarget = (value: string | undefined): StackblitzTarget | undefined => {
  const parsed = parseUrl(value ?? '', placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, stackblitzHosts)) {
    return
  }

  const [first, second] = getPathSegments(parsed)

  // /github/{owner}/{repo} renders, but its id is a key the oEmbed endpoint answers 404 on.
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
