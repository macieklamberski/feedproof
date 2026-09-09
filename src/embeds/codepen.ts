import { getPathSegments, isHostOf, parseUrl, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize, text } from '../utils/dom.js'
import { composeQuery, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Listed exactly, not by subdomain: blog.codepen.io and cdpn.io name no pen.
const codepenHosts = ['codepen.io', 'www.codepen.io']

// Slugs come in three lengths: 5 on pens from around 2012, 7 since, and 32 hex on CodePen's own.
const slugRegex = /^[A-Za-z0-9]+$/
const userRegex = /^[A-Za-z0-9_-]+$/
const playerParamRegex = /^[A-Za-z0-9,_-]{1,64}$/
const leadingAtRegex = /^@/
// The player names itself in the title when the pen has none, as "CodePen by {user}".
const carrierTitleRegex = /^codepen by /i

// `key` is what the share dialog appends to a private pen, and `token` the JWT a signed-token
// embed carries. A JWT is dotted base64url and long, every character of it url-safe.
const privateParamNames = ['key', 'token']
const privateParamRegex = /^[A-Za-z0-9_.-]{1,512}$/

// Segments CodePen owns in the position a username sits in. `cpe` is the 2.0 editor's own path
// and the prefill endpoint lives under it, so `cpe/embed/prefill` has the exact shape of a pen
// url while naming no pen.
const reservedOwnerSegments = new Set(['api', 'collection', 'cpe', 'pen', 'project', 'spark'])

// What CodePen's share dialog writes in place of an author who asked not to be named, and what
// the resolver falls back to when the markup names nobody. The player ignores this segment
// either way, so it only has to be a syntactically valid username.
const anonymousUser = 'anon'

// CodePen's snippet ships `data-height="300"` and calls every attribute but slug and user optional.
const defaultPenHeight = 300

// Titles the snippet writes when the pen has none. They name the carrier, not the pen,
// so they are worse than no title at all.
const placeholderTitles = new Set(['codepen embed', 'untitled', 'codepen'])

type CodepenTarget = {
  kind: 'pen' | 'embed'
  // Absent when the url or the markup names no author. Only the pen's public page needs it:
  // `codepen.io/{anyone}/embed/{slug}` serves the right pen and rewrites the byline itself,
  // verified in a browser against a fabricated username on 2026-08-15.
  user?: string
  // How the owner is addressed in a public url: `team/{name}` for a team, `{name}` for a person.
  // The player does not care, but the pen's page does.
  ownerPath?: string
  // Whatever opens a private pen, by parameter name. Without it the placeholder would link to a
  // pen the reader cannot see.
  grants?: Record<string, string>
  // Which panes the player opens on and in what colours. The loader copies both into the query
  // of the iframe it builds, so a placeholder minted from the block carries them too. Neither
  // belongs on the pen's own page, which has no panes to choose.
  defaultTab?: string
  themeId?: string
  // The height stated in the player's own query, which is where the loader puts it and where most
  // iframe urls carry it. An attribute on the carrier outranks it, since that is the box the
  // publisher actually laid out.
  height?: number
  slug: string
}

const readUser = (value: string | undefined): string | undefined => {
  // The share dialog writes the handle with its `@`, while the url path carries both spellings.
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
  // A twice-encoded feed leaves a literal `&amp;` that hides the `key` parameter after it.
  const parsed = parseUrl(value?.replaceAll('&amp;', '&') ?? '', placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, codepenHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  // A team's pens sit one segment deeper, under `team/{name}/`.
  const isTeam = segments[0] === 'team'
  const [rawUser, kind, ...rest] = isTeam ? segments.slice(1) : segments

  if (!rawUser || reservedOwnerSegments.has(rawUser.toLowerCase())) {
    return
  }

  if (kind !== 'pen' && kind !== 'embed') {
    return
  }

  // `embed/preview/{slug}` is the deferred-loading player, the same pen behind one more segment.
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

// The loader spells the panes plural in the url it builds whatever the attribute is called:
// `?default-tabs=css%2Cresult` is what a rendered block carries.
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
  // `shots.codepen.io` serves four widths, 512 through 1280, and answers 200 with a picture of
  // CodePen's own 404 page once a pen is gone or private.
  // The slug alone selects the render, so an author-less embed still carries a thumbnail.
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
    // The public page is the one address the author's name really selects: an embed built with
    // the wrong one still plays, but the page it links to belongs to whoever holds that handle.
    ...(target.ownerPath && {
      url: `https://codepen.io/${target.ownerPath}/pen/${target.slug}${composePenQuery(target, false)}`,
    }),
    thumbnail: composeThumbnail(target),
    height: target.height ?? defaultPenHeight,
    ...(target.user && { author: `@${target.user}` }),
    ...extra,
  }
}

// `data-slug-hash` is what the dialog writes today and `data-href` what it wrote before, holding
// the pen's whole url. A prefill block carries neither.
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
  // The loader reads a signed token off the block and appends it to the player it builds, so a
  // private pen embedded this way names its own key here, not in a url.
  const token = keepIfMatches(attr(element, 'data-token'), privateParamRegex)
  const grants = token ? { ...reference.grants, token } : reference.grants
  let user = reference.user
  let ownerPath = reference.ownerPath
  let linkedTitle: string | undefined

  // The loader follows the sentence's own link, whose text is the pen's name in an intact snippet.
  for (const anchor of element.querySelectorAll('a[href]')) {
    const target = parseTarget(attr(anchor, 'href'))

    if (target?.kind !== 'pen' || target.slug !== slug) {
      continue
    }

    user ??= target.user
    ownerPath ??= target.ownerPath
    linkedTitle ??= text(anchor)
  }

  // After the link: `data-user` goes stale when a block is copied and the two disagree.
  // `data-user` names a person and has no way to say team.
  user ??= readUser(attr(element, 'data-user'))
  ownerPath ??= user

  const title = attr(element, 'data-pen-title') ?? linkedTitle
  // The height the author chose for the player, which the loader passes straight through. A
  // block naming the pen by its whole url states it in that url's query instead, so the
  // attribute is read first and the url is what answers when it is absent.
  const height = parsePixelSize(attr(element, 'data-height')) ?? reference.height

  // The panes and the theme the author picked for this player, which the loader would have put
  // into the query of the iframe it built.
  const defaultTab = keepIfMatches(attr(element, 'data-default-tab'), playerParamRegex)
  const themeId = keepIfMatches(attr(element, 'data-theme-id'), playerParamRegex)

  return composeEmbed(
    { kind: 'embed', user, ownerPath, grants, slug, defaultTab, themeId, height },
    { title },
  )
}

// CodePen's "See the Pen" paragraph, which only the ei.js loader feeds strip turns into a pen.
// One ei.js script serves every pen in a post and often sits far below them.
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
