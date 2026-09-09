import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'arte'

const arteHosts = ['arte.tv']

// A program id is `{6 digits}-{3 digits}-{version letter}`, the same in every language.
const programIdRegex = /^\d{6}-\d{3}-[A-Z]$/

// A shape, not a list: ARTE keeps adding languages and a list would refuse the next one.
// The embed page serves the same shell whatever the language, so a wrong one is not visibly wrong.
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

// `api.arte.tv/api/player/v2/config/{lang}/{id}` answers with the title, description, duration,
// poster and page url, with no key. `arte.tv/{lang}/videos/{id}/` 301s to the slugged page
// while the program is online and 404s once it has expired.
const composeEmbed = ({ language, id }: Program): EmbedResolverResult => {
  return {
    provider,
    id: `${language}/${id}`,
    src: `https://www.arte.tv/embeds/${language}/${id}`,
    url: `https://www.arte.tv/${language}/videos/${id}/`,
    // The player fills whatever box it gets, and ARTE's own snippet sizes it `100%` both ways.
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

// ARTE's player iframe, current or a retired player that names the program in a config url.
export const arteEmbedResolver = createUrlEmbedResolver(arteHosts, arteResolveEmbed)

// The share snippet's own parameters, muted off so the click that loads it hears the sound.
export const arteRenderHint: EmbedRenderHint = {
  provider,
  // `mute: '0'` is what lets the click that loads the player hear the sound.
  autoplayParams: { autoplay: 'true', mute: '0' },
}
