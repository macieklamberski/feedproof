import { acastRenderHint } from '../embeds/acast.js'
import { archiveRenderHint } from '../embeds/archive.js'
import { arteRenderHint } from '../embeds/arte.js'
import { audioboomRenderHint } from '../embeds/audioboom.js'
import { blueskyRenderHint } from '../embeds/bluesky.js'
import { brightcoveRenderHint } from '../embeds/brightcove.js'
import { buzzsproutRenderHint } from '../embeds/buzzsprout.js'
import { captivateRenderHint } from '../embeds/captivate.js'
import { codesandboxRenderHint } from '../embeds/codesandbox.js'
import { deezerRenderHint } from '../embeds/deezer.js'
import { flourishRenderHint } from '../embeds/flourish.js'
import { instagramRenderHint } from '../embeds/instagram.js'
import { kalturaRenderHint } from '../embeds/kaltura.js'
import { mastodonRenderHint } from '../embeds/mastodon.js'
import { mixcloudRenderHint } from '../embeds/mixcloud.js'
import { notecomRenderHint } from '../embeds/notecom.js'
import { omnyRenderHint } from '../embeds/omny.js'
import { podbeanRenderHint } from '../embeds/podbean.js'
import { podigeeRenderHint } from '../embeds/podigee.js'
import { redditRenderHint } from '../embeds/reddit.js'
import { rutubeRenderHint } from '../embeds/rutube.js'
import { sketchfabRenderHint } from '../embeds/sketchfab.js'
import { soundcloudRenderHint } from '../embeds/soundcloud.js'
import { spreakerRenderHint } from '../embeds/spreaker.js'
import { tedRenderHint } from '../embeds/ted.js'
import { telegramRenderHint } from '../embeds/telegram.js'
import { twitterRenderHint } from '../embeds/twitter.js'
import { videopressRenderHint } from '../embeds/videopress.js'
import { vimeoRenderHint } from '../embeds/vimeo.js'
import { wistiaRenderHint } from '../embeds/wistia.js'
import { youtubeRenderHint } from '../embeds/youtube.js'
import type { EmbedRenderHint } from '../types.js'

// What a reader needs from each provider once it turns the placeholder into a frame: how to
// start playback on the click, by query or by a message into the frame, and how the player
// reports its rendered height. One per provider, beside its resolver.
export const defaultEmbedRenderHints: Array<EmbedRenderHint> = [
  acastRenderHint,
  archiveRenderHint,
  arteRenderHint,
  audioboomRenderHint,
  blueskyRenderHint,
  brightcoveRenderHint,
  buzzsproutRenderHint,
  captivateRenderHint,
  codesandboxRenderHint,
  deezerRenderHint,
  flourishRenderHint,
  instagramRenderHint,
  kalturaRenderHint,
  mastodonRenderHint,
  mixcloudRenderHint,
  notecomRenderHint,
  omnyRenderHint,
  podbeanRenderHint,
  podigeeRenderHint,
  redditRenderHint,
  rutubeRenderHint,
  sketchfabRenderHint,
  soundcloudRenderHint,
  spreakerRenderHint,
  tedRenderHint,
  telegramRenderHint,
  twitterRenderHint,
  videopressRenderHint,
  vimeoRenderHint,
  wistiaRenderHint,
  youtubeRenderHint,
]
