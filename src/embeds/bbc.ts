import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `bbc.co.uk` 301s every player route onto `bbc.com`.
const bbcHosts = ['bbc.com', 'bbc.co.uk']

// A programme id: eight letters and digits with at least one digit, which keeps `articles` out.
const pidRegex = /^[a-z](?=[0-9a-z]*\d)[0-9a-z]{7}$/
// No width: BBC has grown the article number a digit at a time.
const articleIdRegex = /^\d+$/

// The news and World Service players render at 16:9 of their width. BBC's own embed code states
// a 400 by 500 box, which pads them with blank below.
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
// No page url is derivable: a news page needs its section slug, which the embed does not carry.
export const bbcResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, bbcHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const [first, second, third, fourth, fifth] = segments

  // `/news/av/embed/{pid}/{article}` 301s to `/news/av-embeds/{article}/vpid/{pid}`, and the
  // player answers 404 when either the pid or the article is fabricated.
  if (first === 'news' && second === 'av' && third === 'embed' && isPid(fourth)) {
    return isArticleId(fifth) ? composeNewsEmbed(fifth, fourth) : undefined
  }

  if (first === 'news' && second === 'av-embeds' && isArticleId(third) && fourth === 'vpid') {
    return isPid(fifth) ? composeNewsEmbed(third, fifth) : undefined
  }

  // `/ws/av-embeds/articles/{article}/{pid}/{lang}/` is the same player app as the news one.
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
