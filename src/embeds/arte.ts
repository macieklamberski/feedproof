import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'arte'

const arteHosts = ['arte.tv']

// A program id is `{6 digits}-{3 digits}-{version letter}`, the same in every language.
const programIdRegex = /^\d{6}-\d{3}-[A-Z]$/

// A shape rather than a list: ARTE has gone from two languages to four to six to seven since
// 2015, and each addition would have silently refused a real program. Romanian is the one a list
// would miss today, checked against the config API on 2026-09-07, which answers with Romanian
// metadata for real programs while a `zz` 404s. A wrong language is not visibly wrong here,
// because the embed page serves the same shell whatever it says, so one only arrives when a
// publisher writes it. The program id is what does the safety work.
const languageRegex = /^[a-z]{2}$/

// The retired players, `player/v{3..7}/index.{php,html}`, and `player/index.*` they redirect to.
const legacyPlayerPathRegex = /^\/player\/(?:v\d+\/)?index\.(?:php|html)$/

type Program = { language: string; id: string }

const readProgram = (language: string | undefined, id: string | undefined): Program | undefined => {
  if (!language || !id || !languageRegex.test(language) || !programIdRegex.test(id)) {
    return
  }

  return { language, id }
}

// The retired players took the config url as `json_url`, `api.arte.tv/api/player/v{1,2}/config/
// {lang}/{id}`, which names the program. Older `json_url`s pointed at ARTE Concert's own player
// and at a `papi` guide feed, both gone with no program id to carry over.
const readLegacyProgram = (parsed: URL): Program | undefined => {
  const config = parseUrlOnHosts(parsed.searchParams.get('json_url') ?? '', ['api.arte.tv'])

  if (!config) {
    return
  }

  const [api, player, , route, language, id] = getPathSegments(config)

  if (api !== 'api' || player !== 'player' || route !== 'config') {
    return
  }

  return readProgram(language, id)
}

// The current player is `arte.tv/embeds/{lang}/{id}`, which is also where ARTE 301s its v3
// player. Checked live 2026-09-06 with a browser user agent: the embed page is one 5,501-byte
// shell for any id, but `api.arte.tv/api/player/v2/config/{lang}/{id}` answers 200 with the
// title, description, duration, poster and page url for a real program and 404 for an invented
// one, with no key, so the id carries the language it needs. `arte.tv/{lang}/videos/{id}/`
// 301s to the slugged page while the program is online and 404s once it has expired. The poster
// lives under its own image id, so it stays with enrichment.
//
// The player fills whatever box it gets, 1000x757 at that viewport, and ARTE's own snippet
// sizes it `100%` both ways for a wrapper to shape. Where the corpus carriers state a box it is
// 16:9 in 64 of the 84 sized ones, so that ratio stands in for the 13 that state `100%` alone.
const composeEmbed = ({ language, id }: Program): EmbedResolverResult => {
  return {
    provider,
    id: `${language}/${id}`,
    src: `https://www.arte.tv/embeds/${language}/${id}`,
    url: `https://www.arte.tv/${language}/videos/${id}/`,
    ratio: '16/9',
  }
}

const readProgramFromPlayer = (parsed: URL): Program | undefined => {
  const [route, language, id] = getPathSegments(parsed)

  if (route === 'embeds') {
    return readProgram(language, id)
  }

  if (legacyPlayerPathRegex.test(parsed.pathname)) {
    return readLegacyProgram(parsed)
  }
}

const arteResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)
  const program = parsed && readProgramFromPlayer(parsed)

  if (!program) {
    return
  }

  return { ...composeEmbed(program), title: attr(element, 'title') }
}

export const arteEmbedResolver = createUrlEmbedResolver(arteHosts, arteResolveEmbed)

// The share snippet's own parameters, muted off so the click that loads it hears the sound.
export const arteRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true', mute: '0' },
}
