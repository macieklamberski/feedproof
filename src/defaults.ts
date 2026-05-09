import { youtubeEmbedResolver } from './embeds/youtube.js'
import { extractAceml } from './redirects/aceml.js'
import { extractAdjust } from './redirects/adjust.js'
import { extractAmazonAffiliate } from './redirects/amazonAffiliate.js'
import { extractAmpCache } from './redirects/ampCache.js'
import { extractAwin } from './redirects/awin.js'
import { extractCjNetwork } from './redirects/cjNetwork.js'
import { extractDisqus } from './redirects/disqus.js'
import { extractDouban } from './redirects/douban.js'
import { extractEbayRover } from './redirects/ebayRover.js'
import { extractFacebookShim } from './redirects/facebook.js'
import { extractFeedsportal } from './redirects/feedsportal.js'
import { extractGitee } from './redirects/gitee.js'
import { extractGoogleRedirect } from './redirects/google.js'
import { extractGoogleNewsRedirect } from './redirects/googleNews.js'
import { extractGoogleNewsModern } from './redirects/googleNewsModern.js'
import { extractGoogleTranslateRedirect } from './redirects/googleTranslate.js'
import { extractJianshuGo } from './redirects/jianshuGo.js'
import { extractJuejin } from './redirects/juejin.js'
import { extractLinksynergy } from './redirects/linksynergy.js'
import { extractMailchimp } from './redirects/mailchimp.js'
import { extractMimecast } from './redirects/mimecast.js'
import { extractNicoMs } from './redirects/nicoMs.js'
import { extractOutlookSafelinks } from './redirects/outlookSafelinks.js'
import { extractPocketRedirect } from './redirects/pocket.js'
import { extractPostmark } from './redirects/postmark.js'
import { extractProofpointV1 } from './redirects/proofpointV1.js'
import { extractProofpointV2 } from './redirects/proofpointV2.js'
import { extractProofpointV3 } from './redirects/proofpointV3.js'
import { extractPxf } from './redirects/pxf.js'
import { extractRedditOut } from './redirects/redditOut.js'
import { extractSegmentfault } from './redirects/segmentfault.js'
import { extractShareasale } from './redirects/shareasale.js'
import { extractSjv } from './redirects/sjv.js'
import { extractSkimlinks } from './redirects/skimlinks.js'
import { extractSlack } from './redirects/slack.js'
import { extractSspai } from './redirects/sspai.js'
import { extractSteamLinkfilter } from './redirects/steamLinkfilter.js'
import { extractTradedoubler } from './redirects/tradedoubler.js'
import { extractTumblr } from './redirects/tumblr.js'
import { extractValuecommerce } from './redirects/valuecommerce.js'
import { extractViglink } from './redirects/viglink.js'
import { extractVkAway } from './redirects/vkAway.js'
import { extractYandexTurbo } from './redirects/yandexTurbo.js'
import { extractYouTubeRedirect } from './redirects/youtubeRedirect.js'
import { extractZhihu } from './redirects/zhihu.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { injectEnclosureEmbedPlaceholders } from './transforms/dom/injectEnclosureEmbedPlaceholders.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripParagraphBoundaryBreaks } from './transforms/dom/stripParagraphBoundaryBreaks.js'
import { stripTrackingParams } from './transforms/dom/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapRedirectUrls } from './transforms/dom/unwrapRedirectUrls.js'
import { decodeDoubleEncodedTags } from './transforms/string/decodeDoubleEncodedTags.js'
import { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
import { stripEmptyTags } from './transforms/string/stripEmptyTags.js'
import { stripOrphanedClosingTags } from './transforms/string/stripOrphanedClosingTags.js'
import { unwrapWrappers } from './transforms/string/unwrapWrappers.js'
import type { DomTransform, EmbedResolver, RedirectExtractor, StringTransform } from './types.js'

export const defaultStringTransforms: Array<StringTransform> = [
  stripOrphanedClosingTags,
  decodeDoubleEncodedTags,
  unwrapWrappers,
  paragraphizePlainText,
  stripEmptyTags,
]

export const defaultDomTransforms: Array<DomTransform> = [
  stripComments,
  fixLazyImages,
  resolveRelativeUrls,
  unwrapRedirectUrls,
  stripTrackingParams,
  removeTrackingPixels,
  stripInterBlockBreaks,
  stripParagraphBoundaryBreaks,
  highlightCode,
  mergeConsecutiveOneLinerPres,
  replacePreLineBreaks,
  trimPreWhitespace,
  linkifyUrls,
  replaceEmbedsWithPlaceholders,
  injectEnclosureEmbedPlaceholders,
]

export const defaultFinalStringTransforms: Array<StringTransform> = [stripEmptyTags]

export const defaultEmbedResolvers: Array<EmbedResolver> = [youtubeEmbedResolver]

export const defaultLazySrcAttributes = ['data-src', 'data-original', 'data-lazy-src', 'data-url']

export const defaultTrackingHosts = [
  'feedsportal.com',
  'stats.wordpress.com',
  'pixel.wp.com',
  'doubleclick.net',
  'google-analytics.com',
]

export const defaultTrackingPathSegments = ['pixel', 'beacon', 'track', 'count']

export const defaultRedirectExtractors: Array<RedirectExtractor> = [
  // Search engines.
  extractGoogleRedirect,
  extractGoogleNewsRedirect,
  extractGoogleNewsModern,
  extractGoogleTranslateRedirect,
  extractYouTubeRedirect,

  // Email and security gateways.
  extractOutlookSafelinks,
  extractProofpointV1,
  extractProofpointV2,
  extractProofpointV3,
  extractMimecast,
  extractPostmark,
  extractAceml,
  extractMailchimp,
  extractSlack,

  // Affiliate networks.
  extractShareasale,
  extractAwin,
  extractLinksynergy,
  extractSkimlinks,
  extractTradedoubler,
  extractCjNetwork,
  extractValuecommerce,
  extractViglink,
  extractPxf,
  extractSjv,
  extractEbayRover,
  extractAmazonAffiliate,
  extractAdjust,

  // Social and community platforms.
  extractFacebookShim,
  extractPocketRedirect,
  extractTumblr,
  extractVkAway,
  extractRedditOut,
  extractDisqus,
  extractSteamLinkfilter,
  extractDouban,
  extractNicoMs,

  // Developer and publishing platforms.
  extractZhihu,
  extractJuejin,
  extractSspai,
  extractJianshuGo,
  extractSegmentfault,
  extractGitee,

  // Cache and proxy services.
  extractAmpCache,
  extractYandexTurbo,

  // Legacy aggregators.
  extractFeedsportal,
]
