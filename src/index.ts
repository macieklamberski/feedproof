import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultDomTransforms,
  defaultEmbedResolvers,
  defaultFinalStringTransforms,
  defaultLazySrcAttributes,
  defaultRedirectExtractors,
  defaultStringTransforms,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
} from './defaults.js'
import type { TransformContentOptions, TransformContext } from './types.js'

export const transformContent = (html: string, options: TransformContentOptions = {}): string => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    embedResolvers: options.embedResolvers ?? defaultEmbedResolvers,
    lazySrcAttributes: options.lazySrcAttributes ?? defaultLazySrcAttributes,
    trackingHosts: options.trackingHosts ?? defaultTrackingHosts,
    trackingPathSegments: options.trackingPathSegments ?? defaultTrackingPathSegments,
    redirectExtractors: options.redirectExtractors ?? defaultRedirectExtractors,
    articleTitle: options.articleTitle,
  }

  const stringFns = options.stringTransforms ?? defaultStringTransforms
  const domFns = options.domTransforms ?? defaultDomTransforms
  const finalFns = options.finalStringTransforms ?? defaultFinalStringTransforms

  // Phase 1: String transforms.
  const afterString = applyStringTransforms(
    html,
    stringFns.map((transform) => transform(context)),
  )

  // Phase 2: DOM transforms.
  const afterDom = applyDomTransforms(
    afterString,
    domFns.map((transform) => transform(context)),
  )

  // Phase 3: Final string transforms — cleans up empties produced by Phase 2.
  const afterFinal = applyStringTransforms(
    afterDom,
    finalFns.map((transform) => transform(context)),
  )

  return afterFinal
}

export {
  applyDomTransforms,
  applyStringTransforms,
  createEmbedPlaceholder,
  parseFragment,
  stripOversizedBase64Sources,
  transformHtml,
} from './common.js'
export {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedResolver,
  youtubeResolveEmbed,
} from './embeds/youtube.js'
export { extractAceml } from './redirects/aceml.js'
export { extractAdjust } from './redirects/adjust.js'
export { extractAmazonAffiliate } from './redirects/amazonAffiliate.js'
export { extractAmpCache } from './redirects/ampCache.js'
export { extractAwin } from './redirects/awin.js'
export { extractCjNetwork } from './redirects/cjNetwork.js'
export { extractDigidip } from './redirects/digidip.js'
export { extractDisqus } from './redirects/disqus.js'
export { extractDouban } from './redirects/douban.js'
export { extractEbayRover } from './redirects/ebayRover.js'
export { extractEffiliation } from './redirects/effiliation.js'
export { extractEmbedly } from './redirects/embedly.js'
export { extractFacebookShim } from './redirects/facebook.js'
export { extractFeedsportal } from './redirects/feedsportal.js'
export { extractFirebaseDynamicLinks } from './redirects/firebaseDynamicLinks.js'
export { extractFlipboard } from './redirects/flipboard.js'
export { extractGateSc } from './redirects/gateSc.js'
export { extractGeoriot } from './redirects/georiot.js'
export { extractGitee } from './redirects/gitee.js'
export { extractGoogleRedirect } from './redirects/google.js'
export { extractGoogleNewsRedirect } from './redirects/googleNews.js'
export { extractGoogleNewsModern } from './redirects/googleNewsModern.js'
export { extractGoogleTranslateRedirect } from './redirects/googleTranslate.js'
export { extractHashnode } from './redirects/hashnode.js'
export { extractIcptrack } from './redirects/icptrack.js'
export { extractIdealoPartner } from './redirects/idealoPartner.js'
export { extractJianshuGo } from './redirects/jianshuGo.js'
export { extractJuejin } from './redirects/juejin.js'
export { extractLeverAnalytics } from './redirects/leverAnalytics.js'
export { extractLinksynergy } from './redirects/linksynergy.js'
export { extractMailchimp } from './redirects/mailchimp.js'
export { extractMailpanion } from './redirects/mailpanion.js'
export { extractMailpgn } from './redirects/mailpgn.js'
export { extractMailtrack } from './redirects/mailtrack.js'
export { extractMedium } from './redirects/medium.js'
export { extractMimecast } from './redirects/mimecast.js'
export { extractMozillaOutgoing } from './redirects/mozillaOutgoing.js'
export { extractNarrativ } from './redirects/narrativ.js'
export { extractNicoMs } from './redirects/nicoMs.js'
export { extractOutlookSafelinks } from './redirects/outlookSafelinks.js'
export { extractPartnerAds } from './redirects/partnerAds.js'
export { extractPocketRedirect } from './redirects/pocket.js'
export { extractPostmark } from './redirects/postmark.js'
export { extractProofpointV1 } from './redirects/proofpointV1.js'
export { extractProofpointV2 } from './redirects/proofpointV2.js'
export { extractProofpointV3 } from './redirects/proofpointV3.js'
export { extractPxf } from './redirects/pxf.js'
export { extractRecruitics } from './redirects/recruitics.js'
export { extractRedditOut } from './redirects/redditOut.js'
export { extractRedirectingat } from './redirects/redirectingat.js'
export { extractSegmentfault } from './redirects/segmentfault.js'
export { extractShareasale } from './redirects/shareasale.js'
export { extractSjv } from './redirects/sjv.js'
export { extractSkimlinks } from './redirects/skimlinks.js'
export { extractSlack } from './redirects/slack.js'
export { extractSmartredirect } from './redirects/smartredirect.js'
export { extractSspai } from './redirects/sspai.js'
export { extractSteamLinkfilter } from './redirects/steamLinkfilter.js'
export { extractTelegramIv } from './redirects/telegramIv.js'
export { extractTradedoubler } from './redirects/tradedoubler.js'
export { extractTumblr } from './redirects/tumblr.js'
export { extractValuecommerce } from './redirects/valuecommerce.js'
export { extractViglink } from './redirects/viglink.js'
export { extractVkAway } from './redirects/vkAway.js'
export { extractWebArchive } from './redirects/webArchive.js'
export { extractYandexTurbo } from './redirects/yandexTurbo.js'
export { extractYouTubeRedirect } from './redirects/youtubeRedirect.js'
export { extractZhihu } from './redirects/zhihu.js'
export { fixLazyImages } from './transforms/dom/fixLazyImages.js'
export { detectLanguage, highlightCode } from './transforms/dom/highlightCode.js'
export { injectEnclosureEmbedPlaceholders } from './transforms/dom/injectEnclosureEmbedPlaceholders.js'
export { linkifyUrls } from './transforms/dom/linkifyUrls.js'
export { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
export { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
export { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
export { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
export { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
export { simplifyFigures } from './transforms/dom/simplifyFigures.js'
export { stripComments } from './transforms/dom/stripComments.js'
export { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
export { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
export { stripParagraphBoundaryBreaks } from './transforms/dom/stripParagraphBoundaryBreaks.js'
export { stripTrackingParams } from './transforms/dom/stripTrackingParams.js'
export { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
export { extractRedirectTarget, unwrapRedirectUrls } from './transforms/dom/unwrapRedirectUrls.js'
export { decodeDoubleEncodedTags } from './transforms/string/decodeDoubleEncodedTags.js'
export { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
export { stripEmptyTags } from './transforms/string/stripEmptyTags.js'
export { stripOrphanedClosingTags } from './transforms/string/stripOrphanedClosingTags.js'
export { unwrapWrappers } from './transforms/string/unwrapWrappers.js'
export type {
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'
export type { ParamExtractorConfig } from './utils.js'
export { chooseBaseUrl, coerceNumber, createParamExtractor } from './utils.js'
