import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `bbc.co.uk` 301s every player route onto `bbc.com`.
const bbcHosts = ['bbc.com', 'bbc.co.uk']

// A programme id: eight characters, letters and digits with at least one digit, `p06sf6tr` or
// `b0bkqt8j`. The digit is what keeps a path word like `articles` from reading as one.
const pidRegex = /^[a-z](?=[0-9a-z]*\d)[0-9a-z]{7}$/
const articleIdRegex = /^\d{6,9}$/

// The news player answers 200 with the clip and its title for a real pid and article pair and
// 404 when either is fabricated, so both are kept. Measured 2026-09-06 in a browser at 300 and
// 600 pixels wide, the page is 171 and 340 tall: 16:9 of the width. The BBC's snippet states
// 400 by 500 for the same player, which is why the ratio is preferred over the carrier.
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

// Three players, all named by a pid. The news clip player is pasted as
// `/news/av/embed/{pid}/{article}`, which 301s to `/news/av-embeds/{article}/vpid/{pid}`, the
// form minted here. The World Service one, `/ws/av-embeds/articles/{article}/{pid}/{lang}/`,
// is the same player app and is passed through. The programmes one, `/programmes/{pid}/player`,
// answers 200 for a real pid and 404 for a fabricated one, and its size was not measured, so
// it states none. No page url is derivable from any of them: a news page needs its section
// slug, which the embed does not carry.
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
