import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize, text } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// `blog.codepen.io` is the marketing blog and `cdpn.io` serves a pen's raw output, so neither
// names an embeddable pen. Only the bare host and its `www.` spelling do, which is why the url
// is checked with `isHostOf` alone, not through `parseUrlOnHosts`: that one admits every
// subdomain, and the blog would come through with it.
const codepenHosts = ['codepen.io', 'www.codepen.io']

// Slugs are opaque and come in three lengths: 5 characters on pens from around 2012, 7 on
// everything CodePen has minted since, and 32 hex characters on the ones its own team embeds.
const slugRegex = /^[A-Za-z0-9]{5,32}$/
const userRegex = /^[A-Za-z0-9_-]{1,32}$/
const playerParamRegex = /^[A-Za-z0-9,_-]{1,64}$/
const leadingAtRegex = /^@/
// The player names itself in the title when the pen has none, as "CodePen by {user}".
const carrierTitleRegex = /^codepen by /i

// What gates a private pen, and there are two: `key`, which the share dialog appends, and
// `token`, the JWT a signed-token embed carries. Either one is what makes the pen open at all,
// so both travel with every address minted for it. The bound is generous because a JWT is
// dotted base64url and long, and every character it allows is already url-safe.
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

// What the share dialog writes when the author does not choose: its own snippet ships
// `data-height="300"`, its docs call every attribute but the slug and user an optional override,
// and 300 is the commonest value in the corpus. Stated here rather than left to the consumer's
// default, so the placeholder reserves the right space for a player that declares none. A
// carrier that states a size or a shape of its own replaces it outright.
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
  // A feed that encoded its html twice leaves a literal `&amp;` inside the url, which makes the
  // parameter after it read as `amp;key` and hides it. One corpus file ships an iframe like that.
  const parsed = parseUrl(value?.replaceAll('&amp;', '&') ?? '', 'https://example.com')

  if (!parsed || !isHostOf(parsed, codepenHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  // A team's pens sit one segment deeper, under `team/{name}/`. No sampled feed carries one, so
  // this is read from the url shape rather than from a specimen: CodePen blocks automated
  // requests, and the route could not be confirmed live.
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
    user,
    ownerPath: user && (isTeam ? `team/${user}` : user),
    ...(Object.keys(grants).length > 0 && { grants }),
    ...(height !== undefined && { height }),
    slug,
  }
}

// The pen's own page takes what unlocks it and nothing else: it has no panes to choose. The
// player takes the panes and the theme as well, and the loader spells the panes plural in the
// url it builds whatever the attribute is called: `?default-tabs=css%2Cresult` is what a
// rendered block carries.
const composeQuery = (target: CodepenTarget, forPlayer: boolean): string => {
  const params = new URLSearchParams(target.grants)

  if (forPlayer && target.defaultTab) {
    params.set('default-tabs', target.defaultTab)
  }

  if (forPlayer && target.themeId) {
    params.set('theme-id', target.themeId)
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

// A pen renders itself into a screenshot on demand, so this needs no key and no fetch. The slug
// alone selects it: five live pens checked on 2026-08-15 each returned their own render through
// a fabricated username, which is what lets an author-less embed still carry a thumbnail.
//
// Four widths are served, 512 through 1280. 512 is the one measured as publicly reachable and
// CDN-cached, and a placeholder does not need more.
//
// The service answers 200 with a picture of CodePen's own 404 page once a pen is gone or private,
// so a dead pen shows a dead pen, not nothing.
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
    src: `https://codepen.io/${owner}/embed/${target.slug}${composeQuery(target, true)}`,
    // The public page is the one address the author's name really selects: an embed built with
    // the wrong one still plays, but the page it links to belongs to whoever holds that handle.
    ...(target.ownerPath && {
      url: `https://codepen.io/${target.ownerPath}/pen/${target.slug}${composeQuery(target, false)}`,
    }),
    thumbnail: composeThumbnail(target),
    height: target.height ?? defaultPenHeight,
    ...(target.user && { author: `@${target.user}` }),
    ...extra,
  }
}

// Which pen the block names. `data-slug-hash` is what the dialog writes today. `data-href` is
// what it wrote before that, holding the pen's whole url, and the loader still maps the one onto
// the other. A prefill block carries neither and resolves to nothing on purpose: its code lives
// in the `<pre>` children and no saved pen sits behind it.
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

// CodePen ships a pen as a paragraph of "See the Pen … by … on CodePen." links carrying the pen
// in `data-*`, then an `ei.js` loader that swaps the paragraph for the player. Without the script
// a reader gets the sentence and no pen, and the loader is stripped long before this runs.
//
// One script serves every pen in a post and often sits far below them, so the paragraph has to
// stand on its own: the pen reference is what names it, and it is what the loader keys on too.
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

  // The sentence's own link to the pen is the one source that names the pen and its owner in
  // the same breath, so it wins over `data-user`: the two disagree when a block is copied and
  // the attribute is left stale, and the link is what the loader itself follows. That anchor's
  // text is the pen's name whenever the snippet is intact.
  for (const anchor of element.querySelectorAll('a[href]')) {
    const target = parseTarget(attr(anchor, 'href'))

    if (target?.kind !== 'pen' || target.slug !== slug) {
      continue
    }

    user ??= target.user
    ownerPath ??= target.ownerPath
    linkedTitle ??= text(anchor)
  }

  // About one anchor block in nine has no pen link that names an owner, and `data-user` is what
  // is left. It names a person and has no way to say "team", so it stands in for the owner path
  // only once no link has supplied one.
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

export const codepenWidgetEmbedResolver = createMarkupEmbedResolver(
  [
    'p.codepen[data-slug-hash]',
    'p.codepen[data-href]',
    'div.codepen[data-slug-hash]',
    'div.codepen[data-href]',
  ].join(', '),
  readWidget,
)

// The player, either written by hand or left behind by a CMS that ran `ei.js` before exporting.
// The publisher's own query selects which panes open and which theme they use, so their url is
// kept whole instead of rebuilt from the slug.
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

export const codepenIframeEmbedResolver = createUrlEmbedResolver(
  ['codepen.io'],
  codepenResolveEmbed,
)
