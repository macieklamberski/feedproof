import { blueskyRenderHint } from './embeds/bluesky.js'
import { instagramRenderHint } from './embeds/instagram.js'
import { mastodonRenderHint } from './embeds/mastodon.js'
import { notecomRenderHint } from './embeds/notecom.js'
import { podigeeRenderHint } from './embeds/podigee.js'
import { redditRenderHint } from './embeds/reddit.js'
import { telegramRenderHint } from './embeds/telegram.js'
import { twitterRenderHint } from './embeds/twitter.js'
import { vimeoRenderHint } from './embeds/vimeo.js'
import { youtubeRenderHint } from './embeds/youtube.js'
import type { EmbedRenderHint } from './types.js'

// Its own entry, `feedsweep/hints`, so a reader running in a browser imports the hints and
// nothing of the pipeline behind them.
export const defaultEmbedRenderHints: Array<EmbedRenderHint> = [
  blueskyRenderHint,
  instagramRenderHint,
  mastodonRenderHint,
  notecomRenderHint,
  podigeeRenderHint,
  redditRenderHint,
  telegramRenderHint,
  twitterRenderHint,
  vimeoRenderHint,
  youtubeRenderHint,
]

export type { EmbedRenderHint } from './types.js'
