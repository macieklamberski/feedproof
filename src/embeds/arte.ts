import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'arte'

const arteHosts = ['arte.tv']

const programIdRegex = /^\d{6}-\d{3}-[A-Z]$/

const languageRegex = /^[a-z]{2}$/

const legacyPlayerPathRegex = /^\/player\/(?:v\d+\/)?index\.(?:php|html)$/

type Program = { language: string; id: string }

const readProgram = (language: string | undefined, id: string | undefined): Program | undefined => {
  if (!language || !id || !languageRegex.test(language) || !programIdRegex.test(id)) {
    return
  }

  return { language, id }
}

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

// ARTE's player iframe, current or a retired player that names the program in a config url.
export const arteEmbedResolver = createUrlEmbedResolver(arteHosts, arteResolveEmbed)

export const arteRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true', mute: '0' },
}
