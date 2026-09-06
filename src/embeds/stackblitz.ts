import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { audioFileRegex, documentFileRegex, imageFileRegex, videoFileRegex } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `blog.stackblitz.com` and `developer.stackblitz.com` are prose, and a project's running preview
// lives on `*.stackblitz.io`, so only the bare host and its `www.` spelling name a project.
const stackblitzHosts = ['stackblitz.com', 'www.stackblitz.com']

// A project is addressed by its own slug rather than by a hash behind one, so the whole segment is
// the id. Hyphens and dots are both legal in it (`vitejs-vite-jfnozz`, `angular-ivy-snow`).
const slugRegex = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/

// A slug carries dots, so a filename passes it. The enclosure probe offers every attachment a feed
// carries to this resolver, so an `.mp3` on the host would otherwise be minted as a project and take
// the place of a playable element.
const isFileName = (value: string): boolean => {
  return (
    documentFileRegex.test(value) ||
    audioFileRegex.test(value) ||
    videoFileRegex.test(value) ||
    imageFileRegex.test(value)
  )
}

// What the share dialog writes beside `width="100%"`, and the commonest of the corpus values. A
// fixed height and not a ratio: an unsized embed measured 150 tall at both 500 and 1000 pixels wide,
// the HTML default, because the editor fills its box rather than reporting one.
const defaultProjectHeight = 500

type StackblitzTarget = {
  id: string
  // The query the publisher chose, which selects the open file, the pane and the theme. Carried
  // across when `/run/` is rewritten so the repair keeps their layout.
  query: string
}

const parseTarget = (value: string | undefined): StackblitzTarget | undefined => {
  const parsed = parseUrl(value ?? '', 'https://example.com')

  if (!parsed || !isHostOf(parsed, stackblitzHosts)) {
    return
  }

  const [first, second] = getPathSegments(parsed)

  // `/run/{slug}` is the retired preview-only route of the 2017 EngineBlock era. It answers 404
  // today while `/edit/{slug}` serves the same project, so the id is minted onto the live route.
  // `/github/{owner}/{repo}` embeds a repository instead of a project: it renders, but the oEmbed
  // endpoint answers 404 for it, so an id taken from it would be a key nothing can look up.
  if ((first !== 'edit' && first !== 'run') || !second || !slugRegex.test(second)) {
    return
  }

  if (isFileName(second)) {
    return
  }

  return { id: second, query: parsed.search }
}

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
    ...(title && { title }),
  }
}

export const stackblitzIframeEmbedResolver = createUrlEmbedResolver(
  ['stackblitz.com'],
  stackblitzResolveEmbed,
)
