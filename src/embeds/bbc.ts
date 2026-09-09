import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const bbcHosts = ['bbc.com', 'bbc.co.uk']

// A programme id: eight letters and digits with at least one digit.
const pidRegex = /^[a-z](?=[0-9a-z]*\d)[0-9a-z]{7}$/
const articleIdRegex = /^\d+$/

const newsPlayerRatio = '16/9'

const isPid = (segment: string | undefined): segment is string => {
  return segment !== undefined && pidRegex.test(segment)
}

const isArticleId = (segment: string | undefined): segment is string => {
  return segment !== undefined && articleIdRegex.test(segment)
}

const composeNewsEmbed = (article: string, pid: string): EmbedResolverResult => {
  return {
    provider: 'bbc',
    id: pid,
    src: `https://www.bbc.com/news/av-embeds/${article}/vpid/${pid}`,
    ratio: newsPlayerRatio,
  }
}

// BBC's news, World Service and programmes clip players, pasted in a portrait box that pads them.
export const bbcResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, bbcHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const [first, second, third, fourth, fifth] = segments

  if (first === 'news' && second === 'av' && third === 'embed' && isPid(fourth)) {
    return isArticleId(fifth) ? composeNewsEmbed(fifth, fourth) : undefined
  }

  if (first === 'news' && second === 'av-embeds' && isArticleId(third) && fourth === 'vpid') {
    return isPid(fifth) ? composeNewsEmbed(third, fifth) : undefined
  }

  if (first === 'ws' && second === 'av-embeds') {
    const pid = segments.find(isPid)

    if (!pid) {
      return
    }

    return {
      provider: 'bbc',
      id: pid,
      src: `https://www.bbc.com${parsed.pathname}`,
      ratio: newsPlayerRatio,
    }
  }

  if (first === 'programmes' && isPid(second) && third === 'player') {
    return {
      provider: 'bbc',
      id: second,
      src: `https://www.bbc.co.uk/programmes/${second}/player`,
    }
  }
}

export const bbcIframeEmbedResolver = createUrlEmbedResolver(bbcHosts, bbcResolveEmbed, {
  preferResolverSize: true,
})
