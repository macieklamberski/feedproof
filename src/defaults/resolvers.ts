import { affingerCiteResolver } from '../cites/affinger.js'
import { amebaCiteResolver } from '../cites/ameba.js'
import { blogCardCiteResolver } from '../cites/blogcard.js'
import { buddybossCiteResolver } from '../cites/buddyboss.js'
import { buddypressCiteResolver } from '../cites/buddypress.js'
import { cocoonCiteResolver } from '../cites/cocoon.js'
import {
  devtoLegacyPostCiteResolver,
  devtoLinkCiteResolver,
  devtoPostCiteResolver,
} from '../cites/devto.js'
import { discourseCiteResolver } from '../cites/discourse.js'
import { embedlyCiteResolver } from '../cites/embedly.js'
import { ghostCiteResolver } from '../cites/ghost.js'
import { hatenaCiteResolver } from '../cites/hatena.js'
import { mediumCiteResolver } from '../cites/medium.js'
import { microformatsCiteResolver } from '../cites/microformats.js'
import { nodebbCiteResolver } from '../cites/nodebb.js'
import { notecomCiteResolver } from '../cites/notecom.js'
import { paragraphCiteResolver } from '../cites/paragraph.js'
import { pzlinkcardCiteResolver } from '../cites/pzlinkcard.js'
import {
  substackCrossPostCiteResolver,
  substackOwnPostCiteResolver,
  substackPostEmbedCiteResolver,
  substackPublicationCiteResolver,
} from '../cites/substack.js'
import { swellCiteResolver } from '../cites/swell.js'
import { tcdCiteResolver } from '../cites/tcd.js'
import { tistoryCiteResolver } from '../cites/tistory.js'
import { tumblrCiteResolver } from '../cites/tumblr.js'
import { xenforoCiteResolver } from '../cites/xenforo.js'
import { acastEmbedResolver } from '../embeds/acast.js'
import { anchorEmbedResolver } from '../embeds/anchor.js'
import { aparatIframeEmbedResolver, aparatScriptEmbedResolver } from '../embeds/aparat.js'
import { appleEmbedResolver } from '../embeds/apple.js'
import { archiveFlashEmbedResolver, archiveIframeEmbedResolver } from '../embeds/archive.js'
import { audioboomEmbedResolver } from '../embeds/audioboom.js'
import { audiomackEmbedResolver } from '../embeds/audiomack.js'
import { bandcampEmbedResolver } from '../embeds/bandcamp.js'
import { bitchuteEmbedResolver } from '../embeds/bitchute.js'
import { bloggerEmbedResolver } from '../embeds/blogger.js'
import { blubrryEmbedResolver } from '../embeds/blubrry.js'
import {
  blueskyBlockquoteEmbedResolver,
  blueskyIframeEmbedResolver,
  blueskyPostElementEmbedResolver,
  blueskyS9eEmbedResolver,
} from '../embeds/bluesky.js'
import {
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
} from '../embeds/brightcove.js'
import {
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
} from '../embeds/buzzsprout.js'
import { captivateEmbedResolver } from '../embeds/captivate.js'
import { codepenIframeEmbedResolver, codepenWidgetEmbedResolver } from '../embeds/codepen.js'
import { dailymotionEmbedResolver } from '../embeds/dailymotion.js'
import { donorboxEmbedResolver } from '../embeds/donorbox.js'
import {
  facebookAmpEmbedResolver,
  facebookBlockquoteEmbedResolver,
  facebookIframeEmbedResolver,
  facebookWidgetEmbedResolver,
  facebookXfbmlEmbedResolver,
} from '../embeds/facebook.js'
import { firesideEmbedResolver } from '../embeds/fireside.js'
import { flickrEmbedResolver } from '../embeds/flickr.js'
import { flourishIframeEmbedResolver, flourishWidgetEmbedResolver } from '../embeds/flourish.js'
import { geniallyEmbedResolver } from '../embeds/genially.js'
import { gettyImagesEmbedResolver } from '../embeds/gettyimages.js'
import { imgurBlockquoteEmbedResolver, imgurIframeEmbedResolver } from '../embeds/imgur.js'
import {
  instagramAmpEmbedResolver,
  instagramBlockquoteEmbedResolver,
  instagramIframeEmbedResolver,
  instagramSubstackEmbedResolver,
} from '../embeds/instagram.js'
import { issuuIframeEmbedResolver, issuuWidgetEmbedResolver } from '../embeds/issuu.js'
import { ivooxEmbedResolver } from '../embeds/ivoox.js'
import {
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
  jwplayerSetupEmbedResolver,
} from '../embeds/jwplayer.js'
import { libsynEmbedResolver } from '../embeds/libsyn.js'
import { linkedinEmbedResolver } from '../embeds/linkedin.js'
import { mastodonEmbedResolver } from '../embeds/mastodon.js'
import { mediavineEmbedResolver } from '../embeds/mediavine.js'
import { megaphoneEmbedResolver } from '../embeds/megaphone.js'
import { mixcloudEmbedResolver } from '../embeds/mixcloud.js'
import { nicovideoIframeEmbedResolver, nicovideoScriptEmbedResolver } from '../embeds/nicovideo.js'
import { notecomIframeEmbedResolver } from '../embeds/notecom.js'
import { odyseeEmbedResolver } from '../embeds/odysee.js'
import { omnyEmbedResolver } from '../embeds/omny.js'
import { podbeanEmbedResolver } from '../embeds/podbean.js'
import { podigeeEmbedResolver, podigeeIframeEmbedResolver } from '../embeds/podigee.js'
import { redditIframeEmbedResolver, redditWidgetEmbedResolver } from '../embeds/reddit.js'
import { scribdFlashEmbedResolver, scribdIframeEmbedResolver } from '../embeds/scribd.js'
import { simplecastEmbedResolver } from '../embeds/simplecast.js'
import { sketchfabEmbedResolver } from '../embeds/sketchfab.js'
import {
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
} from '../embeds/slideshare.js'
import { soundcloudEmbedResolver } from '../embeds/soundcloud.js'
import {
  speakerdeckIframeEmbedResolver,
  speakerdeckScriptEmbedResolver,
} from '../embeds/speakerdeck.js'
import { spotifyEmbedResolver } from '../embeds/spotify.js'
import { spreakerAnchorEmbedResolver, spreakerIframeEmbedResolver } from '../embeds/spreaker.js'
import { standfmEmbedResolver } from '../embeds/standfm.js'
import { tedEmbedResolver } from '../embeds/ted.js'
import { telegramIframeEmbedResolver, telegramScriptEmbedResolver } from '../embeds/telegram.js'
import { tiktokBlockquoteEmbedResolver, tiktokIframeEmbedResolver } from '../embeds/tiktok.js'
import { transistorEmbedResolver } from '../embeds/transistor.js'
import {
  twitterAmpEmbedResolver,
  twitterBlockquoteEmbedResolver,
  twitterIframeEmbedResolver,
  twitterSubstackEmbedResolver,
} from '../embeds/twitter.js'
import { typeformIframeEmbedResolver, typeformWidgetEmbedResolver } from '../embeds/typeform.js'
import {
  videopressFlashEmbedResolver,
  videopressIframeEmbedResolver,
} from '../embeds/videopress.js'
import { vimeoEmbedResolver } from '../embeds/vimeo.js'
import { wistiaEmbedResolver } from '../embeds/wistia.js'
import { youtubeAmpEmbedResolver, youtubeIframeEmbedResolver } from '../embeds/youtube.js'
import { discourseMediaResolver } from '../media/discourse.js'
import { ghostMediaResolver } from '../media/ghost.js'
import { podloveMediaResolver } from '../media/podlove.js'
import { substackMediaResolver } from '../media/substack.js'
import { wechatMediaResolver } from '../media/wechat.js'
import { weeblyMediaResolver } from '../media/weebly.js'
import type { CiteResolver, EmbedResolver, MediaResolver, WidgetResolver } from '../types.js'

// Order matters when selectors overlap: each resolver runs in array order and
// claimed iframes can't be re-matched. Place more specific selectors (e.g.
// meta-providers like Embedly that wrap other providers) before broader ones.
const embedResolvers: Array<EmbedResolver> = [
  youtubeIframeEmbedResolver,
  youtubeAmpEmbedResolver,
  twitterBlockquoteEmbedResolver,
  twitterAmpEmbedResolver,
  twitterSubstackEmbedResolver,
  twitterIframeEmbedResolver,
  tedEmbedResolver,
  typeformWidgetEmbedResolver,
  typeformIframeEmbedResolver,
  transistorEmbedResolver,
  vimeoEmbedResolver,
  videopressIframeEmbedResolver,
  videopressFlashEmbedResolver,
  wistiaEmbedResolver,
  captivateEmbedResolver,
  codepenWidgetEmbedResolver,
  codepenIframeEmbedResolver,
  dailymotionEmbedResolver,
  donorboxEmbedResolver,
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  issuuWidgetEmbedResolver,
  issuuIframeEmbedResolver,
  ivooxEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
  jwplayerAmpEmbedResolver,
  jwplayerSetupEmbedResolver,
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
  libsynEmbedResolver,
  linkedinEmbedResolver,
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
  blubrryEmbedResolver,
  facebookWidgetEmbedResolver,
  facebookIframeEmbedResolver,
  facebookBlockquoteEmbedResolver,
  facebookXfbmlEmbedResolver,
  facebookAmpEmbedResolver,
  mediavineEmbedResolver,
  mixcloudEmbedResolver,
  podbeanEmbedResolver,
  megaphoneEmbedResolver,
  podigeeEmbedResolver,
  podigeeIframeEmbedResolver,
  redditWidgetEmbedResolver,
  redditIframeEmbedResolver,
  simplecastEmbedResolver,
  scribdFlashEmbedResolver,
  scribdIframeEmbedResolver,
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
  sketchfabEmbedResolver,
  tiktokBlockquoteEmbedResolver,
  tiktokIframeEmbedResolver,
  soundcloudEmbedResolver,
  speakerdeckScriptEmbedResolver,
  speakerdeckIframeEmbedResolver,
  firesideEmbedResolver,
  flickrEmbedResolver,
  flourishWidgetEmbedResolver,
  flourishIframeEmbedResolver,
  geniallyEmbedResolver,
  gettyImagesEmbedResolver,
  acastEmbedResolver,
  anchorEmbedResolver,
  aparatIframeEmbedResolver,
  aparatScriptEmbedResolver,
  appleEmbedResolver,
  archiveIframeEmbedResolver,
  archiveFlashEmbedResolver,
  bandcampEmbedResolver,
  bitchuteEmbedResolver,
  bloggerEmbedResolver,
  blueskyBlockquoteEmbedResolver,
  blueskyIframeEmbedResolver,
  blueskyS9eEmbedResolver,
  blueskyPostElementEmbedResolver,
  audioboomEmbedResolver,
  audiomackEmbedResolver,
  notecomIframeEmbedResolver,
  omnyEmbedResolver,
  odyseeEmbedResolver,
  nicovideoScriptEmbedResolver,
  nicovideoIframeEmbedResolver,
  standfmEmbedResolver,
  instagramBlockquoteEmbedResolver,
  instagramAmpEmbedResolver,
  instagramSubstackEmbedResolver,
  instagramIframeEmbedResolver,
  spotifyEmbedResolver,
  spreakerIframeEmbedResolver,
  spreakerAnchorEmbedResolver,
  telegramScriptEmbedResolver,
  telegramIframeEmbedResolver,
  mastodonEmbedResolver,
]

const mediaResolvers: Array<MediaResolver> = [
  substackMediaResolver,
  weeblyMediaResolver,
  wechatMediaResolver,
  ghostMediaResolver,
  discourseMediaResolver,
  podloveMediaResolver,
]

// Order matters here too: a resolver replaces the element it matches, so a later one never
// sees it. No two selectors below overlap today, so nothing depends on the current order. Keep
// the more specific one first if that ever changes.
const citeResolvers: Array<CiteResolver> = [
  ghostCiteResolver,
  substackOwnPostCiteResolver,
  substackCrossPostCiteResolver,
  substackPostEmbedCiteResolver,
  substackPublicationCiteResolver,
  cocoonCiteResolver,
  blogCardCiteResolver,
  discourseCiteResolver,
  swellCiteResolver,
  xenforoCiteResolver,
  microformatsCiteResolver,
  amebaCiteResolver,
  tistoryCiteResolver,
  tcdCiteResolver,
  hatenaCiteResolver,
  devtoLinkCiteResolver,
  nodebbCiteResolver,
  buddybossCiteResolver,
  buddypressCiteResolver,
  pzlinkcardCiteResolver,
  notecomCiteResolver,
  tumblrCiteResolver,
  embedlyCiteResolver,
  paragraphCiteResolver,
  devtoPostCiteResolver,
  devtoLegacyPostCiteResolver,
  affingerCiteResolver,
  mediumCiteResolver,
]

export const defaultWidgetResolvers: Array<WidgetResolver> = [
  ...embedResolvers,
  ...mediaResolvers,
  ...citeResolvers,
]
