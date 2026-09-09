import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const guardianHosts = ['theguardian.com']

// The player is `embed.theguardian.com/embed/video/{path}` and the video's page is the same
// path on `www`: `{section}/video/{yyyy}/{mon}/{dd}/{slug}`. Checked live 2026-09-06: a real
// path answers 200 with the player and its title, a fabricated slug 404.
const playerPathRegex = /^\/embed\/video\/([a-z0-9-]+\/video\/\d{4}\/[a-z]{3}\/\d{2}\/[a-z0-9-]+)$/

// The path dates the video, and the month is the three-letter English abbreviation on every
// edition. A path states a day and not a moment, so `date` carries the calendar day alone, and
// a name outside the twelve months leaves it unstated.
const pathDateRegex = /^[a-z0-9-]+\/video\/(\d{4})\/([a-z]{3})\/(0[1-9]|[12]\d|3[01])\//
const monthNumbers: Record<string, string | undefined> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

const readDate = (path: string): string | undefined => {
  const parts = path.match(pathDateRegex)

  if (!parts) {
    return
  }

  const month = monthNumbers[parts[2]]

  return month ? `${parts[1]}-${month}-${parts[3]}` : undefined
}

// Measured 2026-09-07 in a browser at 300, 600 and 900 pixels wide: the `<video>` is 169, 338
// and 506 tall and is the whole page, so the height is 16:9 of the width with nothing around it.
const playerRatio = '16/9'

export const guardianResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, guardianHosts)
  const path = parsed?.pathname.match(playerPathRegex)?.[1]

  if (parsed?.hostname !== 'embed.theguardian.com' || !path) {
    return
  }

  return {
    provider: 'guardian',
    id: path,
    src: `https://embed.theguardian.com/embed/video/${path}`,
    url: `https://www.theguardian.com/${path}`,
    ratio: playerRatio,
    date: readDate(path),
  }
}

export const guardianEmbedResolver = createUrlEmbedResolver(guardianHosts, guardianResolveEmbed)
