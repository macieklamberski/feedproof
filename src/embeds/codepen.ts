import { getPathSegments, isHostOf, parseUrl, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize, text } from '../utils/dom.js'
import { composeQuery, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Listed exactly, not by subdomain: blog.codepen.io and cdpn.io name no pen.
const codepenHosts = ['codepen.io', 'www.codepen.io']

const slugRegex = /^[A-Za-z0-9]+$/
const userRegex = /^[A-Za-z0-9_-]+$/
const playerParamRegex = /^[A-Za-z0-9,_-]{1,64}$/
const leadingAtRegex = /^@/
const carrierTitleRegex = /^codepen by /i

const privateParamNames = ['key', 'token']
const privateParamRegex = /^[A-Za-z0-9_.-]{1,512}$/

const reservedOwnerSegments = new Set(['api', 'collection', 'cpe', 'pen', 'project', 'spark'])

const anonymousUser = 'anon'

const defaultPenHeight = 300

const placeholderTitles = new Set(['codepen embed', 'untitled', 'codepen'])

type CodepenTarget = {
  kind: 'pen' | 'embed'
  user?: string
  ownerPath?: string
  grants?: Record<string, string>
  defaultTab?: string
  themeId?: string
  height?: number
  slug: string
}

const readUser = (value: string | undefined): string | undefined => {
  const name = value?.trim().replace(leadingAtRegex, '')

  return name && name !== anonymousUser && userRegex.test(name) ? name : undefined
}

const readTitle = (element: Element | undefined): string | undefined => {
  const title = attr(element, 'title')

  if (!title || placeholderTitles.has(title.toLowerCase()) || carrierTitleRegex.test(title)) {
    return
  }

  return title
}

const parseTarget = (value: string | undefined): CodepenTarget | undefined => {
  const parsed = parseUrl(value?.replaceAll('&amp;', '&') ?? '', placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, codepenHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  const isTeam = segments[0] === 'team'
  const [rawUser, kind, ...rest] = isTeam ? segments.slice(1) : segments

  if (!rawUser || reservedOwnerSegments.has(rawUser.toLowerCase())) {
    return
  }

  if (kind !== 'pen' && kind !== 'embed') {
    return
  }

  const slug = kind === 'embed' && rest[0] === 'preview' ? rest[1] : rest[0]

  if (!slug || !slugRegex.test(slug)) {
    return
  }

  const user = readUser(rawUser)
  const grants: Record<string, string> = {}

  for (const name of privateParamNames) {
    const value = keepIfMatches(parsed.searchParams.get(name) ?? undefined, privateParamRegex)

    if (value) {
      grants[name] = value
    }
  }

  const height = parsePixelSize(parsed.searchParams.get('height'))

  return {
    kind,
    slug,
    ...trimObject(
      {
        user,
        ownerPath: user && (isTeam ? `team/${user}` : user),
        grants: trimObject(grants, Boolean),
        height,
      },
      Boolean,
    ),
  }
}

const composePenQuery = (target: CodepenTarget, forPlayer: boolean): string => {
  if (!forPlayer) {
    return composeQuery(target.grants)
  }

  return composeQuery({
    ...target.grants,
    // The player spells it plural in its query whatever the attribute is called.
    ...(target.defaultTab && { 'default-tabs': target.defaultTab }),
    ...(target.themeId && { 'theme-id': target.themeId }),
  })
}

const composeThumbnail = (target: CodepenTarget): string => {
  return `https://shots.codepen.io/${target.user ?? anonymousUser}/pen/${target.slug}-512.jpg`
}

const composeEmbed = (
  target: CodepenTarget,
  extra: Partial<EmbedResolverResult> = {},
): EmbedResolverResult => {
  const owner = target.user ?? anonymousUser

  return {
    provider: 'codepen',
    id: target.slug,
    src: `https://codepen.io/${owner}/embed/${target.slug}${composePenQuery(target, true)}`,
    ...(target.ownerPath && {
      url: `https://codepen.io/${target.ownerPath}/pen/${target.slug}${composePenQuery(target, false)}`,
    }),
    thumbnail: composeThumbnail(target),
    height: target.height ?? defaultPenHeight,
    ...(target.user && { author: `@${target.user}` }),
    ...extra,
  }
}

const readPenReference = (element: Element): CodepenTarget | undefined => {
  const slug = attr(element, 'data-slug-hash')

  if (slug && slugRegex.test(slug)) {
    return { kind: 'embed', slug }
  }

  const href = attr(element, 'data-href')

  if (!href) {
    return
  }

  return parseTarget(href) ?? (slugRegex.test(href) ? { kind: 'embed', slug: href } : undefined)
}

const readWidget = (element: Element): EmbedResolverResult | undefined => {
  const reference = readPenReference(element)

  if (!reference) {
    return
  }

  const { slug } = reference
  const token = keepIfMatches(attr(element, 'data-token'), privateParamRegex)
  const grants = token ? { ...reference.grants, token } : reference.grants
  let user = reference.user
  let ownerPath = reference.ownerPath
  let linkedTitle: string | undefined

  for (const anchor of element.querySelectorAll('a[href]')) {
    const target = parseTarget(attr(anchor, 'href'))

    if (target?.kind !== 'pen' || target.slug !== slug) {
      continue
    }

    user ??= target.user
    ownerPath ??= target.ownerPath
    linkedTitle ??= text(anchor)
  }

  user ??= readUser(attr(element, 'data-user'))
  ownerPath ??= user

  const title = attr(element, 'data-pen-title') ?? linkedTitle
  const height = parsePixelSize(attr(element, 'data-height')) ?? reference.height

  const defaultTab = keepIfMatches(attr(element, 'data-default-tab'), playerParamRegex)
  const themeId = keepIfMatches(attr(element, 'data-theme-id'), playerParamRegex)

  return composeEmbed(
    { kind: 'embed', user, ownerPath, grants, slug, defaultTab, themeId, height },
    { title },
  )
}

// CodePen's "See the Pen" paragraph, which only the ei.js loader feeds strip turns into a pen.
export const codepenWidgetEmbedResolver = createMarkupEmbedResolver(
  [
    'p.codepen[data-slug-hash]',
    'p.codepen[data-href]',
    'div.codepen[data-slug-hash]',
    'div.codepen[data-href]',
  ].join(', '),
  readWidget,
)

export const codepenResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  if (target?.kind !== 'embed') {
    return
  }

  const title = readTitle(element)

  return composeEmbed(target, { src: url, title })
}

// CodePen's player iframe, written by hand or left behind by a CMS that ran ei.js on export.
export const codepenIframeEmbedResolver = createUrlEmbedResolver(
  ['codepen.io'],
  codepenResolveEmbed,
)
