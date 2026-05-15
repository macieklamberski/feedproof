import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultDomTransforms,
  defaultEmbedResolvers,
  defaultFinalStringTransforms,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultStringTransforms,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from './defaults.js'
import type { TransformContentOptions, TransformContext } from './types.js'

export const transformContent = async (
  html: string,
  options: TransformContentOptions = {},
): Promise<string> => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    embedResolvers: options.embedResolvers ?? defaultEmbedResolvers,
    lazySrcAttributes: options.lazySrcAttributes ?? defaultLazySrcAttributes,
    trackingHosts: options.trackingHosts ?? defaultTrackingHosts,
    trackingPathSegments: options.trackingPathSegments ?? defaultTrackingPathSegments,
    urlUnwrappers: options.urlUnwrappers ?? defaultUrlUnwrappers,
    resolveUrlFn: options.resolveUrlFn ?? defaultResolveUrlFn,
  }

  const stringFns = options.stringTransforms ?? defaultStringTransforms
  const domFns = options.domTransforms ?? defaultDomTransforms
  const finalFns = options.finalStringTransforms ?? defaultFinalStringTransforms

  // Phase 1: String transforms.
  const afterString = await applyStringTransforms(
    html,
    stringFns.map((transform) => transform(context)),
  )

  // Phase 2: DOM transforms.
  const afterDom = await applyDomTransforms(
    afterString,
    domFns.map((transform) => transform(context)),
  )

  // Phase 3: Final string transforms — cleans up empties produced by Phase 2.
  const afterFinal = await applyStringTransforms(
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
export { defaultResolveUrlFn } from './defaults.js'
export {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedResolver,
  youtubeResolveEmbed,
} from './embeds/youtube.js'
export { fixLazyImages } from './transforms/dom/fixLazyImages.js'
export { detectLanguage, highlightCode } from './transforms/dom/highlightCode.js'
export { injectEnclosures } from './transforms/dom/injectEnclosures.js'
export { linkifyUrls } from './transforms/dom/linkifyUrls.js'
export { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
export { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
export { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
export { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
export { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
export { simplifyFigures } from './transforms/dom/simplifyFigures.js'
export { stripComments } from './transforms/dom/stripComments.js'
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
  MaybePromise,
  ResolveUrlFn,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'
export { unwrapAceml } from './unwraps/aceml.js'
export { unwrapAdjust } from './unwraps/adjust.js'
export { unwrapAmazonAffiliate } from './unwraps/amazonAffiliate.js'
export { unwrapAmpCache } from './unwraps/ampCache.js'
export { unwrapAwin } from './unwraps/awin.js'
export { unwrapBing } from './unwraps/bing.js'
export { unwrapCjNetwork } from './unwraps/cjNetwork.js'
export { unwrapDigidip } from './unwraps/digidip.js'
export { unwrapDisqus } from './unwraps/disqus.js'
export { unwrapDouban } from './unwraps/douban.js'
export { unwrapDuckduckgo } from './unwraps/duckduckgo.js'
export { unwrapEbayRover } from './unwraps/ebayRover.js'
export { unwrapEffiliation } from './unwraps/effiliation.js'
export { unwrapEmbedly } from './unwraps/embedly.js'
export { unwrapFacebookShim } from './unwraps/facebook.js'
export { unwrapFeedsportal } from './unwraps/feedsportal.js'
export { unwrapFirebaseDynamicLinks } from './unwraps/firebaseDynamicLinks.js'
export { unwrapFlipboard } from './unwraps/flipboard.js'
export { unwrapGateSc } from './unwraps/gateSc.js'
export { unwrapGeoriot } from './unwraps/georiot.js'
export { unwrapGitee } from './unwraps/gitee.js'
export { unwrapGoogle } from './unwraps/google.js'
export { unwrapGoogleAmpViewer } from './unwraps/googleAmpViewer.js'
export { unwrapGoogleNews } from './unwraps/googleNews.js'
export { unwrapGoogleNewsModern } from './unwraps/googleNewsModern.js'
export { unwrapGoogleScholar } from './unwraps/googleScholar.js'
export { unwrapGoogleTranslate } from './unwraps/googleTranslate.js'
export { unwrapHashnode } from './unwraps/hashnode.js'
export { unwrapIcptrack } from './unwraps/icptrack.js'
export { unwrapIdealoPartner } from './unwraps/idealoPartner.js'
export { unwrapInstagramShim } from './unwraps/instagram.js'
export { unwrapJianshuGo } from './unwraps/jianshuGo.js'
export { unwrapJuejin } from './unwraps/juejin.js'
export { unwrapLeverAnalytics } from './unwraps/leverAnalytics.js'
export { unwrapLinksynergy } from './unwraps/linksynergy.js'
export { unwrapMailchimp } from './unwraps/mailchimp.js'
export { unwrapMailpanion } from './unwraps/mailpanion.js'
export { unwrapMailpgn } from './unwraps/mailpgn.js'
export { unwrapMailtrack } from './unwraps/mailtrack.js'
export { unwrapMedium } from './unwraps/medium.js'
export { unwrapMimecast } from './unwraps/mimecast.js'
export { unwrapMozillaOutgoing } from './unwraps/mozillaOutgoing.js'
export { unwrapNarrativ } from './unwraps/narrativ.js'
export { unwrapNicoMs } from './unwraps/nicoMs.js'
export { unwrapOutlookSafelinks } from './unwraps/outlookSafelinks.js'
export { unwrapPartnerAds } from './unwraps/partnerAds.js'
export { unwrapPocket } from './unwraps/pocket.js'
export { unwrapPostmark } from './unwraps/postmark.js'
export { unwrapProofpointV1 } from './unwraps/proofpointV1.js'
export { unwrapProofpointV2 } from './unwraps/proofpointV2.js'
export { unwrapProofpointV3 } from './unwraps/proofpointV3.js'
export { unwrapPxf } from './unwraps/pxf.js'
export { unwrapRecruitics } from './unwraps/recruitics.js'
export { unwrapRedditOut } from './unwraps/redditOut.js'
export { unwrapRedirectingat } from './unwraps/redirectingat.js'
export { unwrapSegmentfault } from './unwraps/segmentfault.js'
export { unwrapShareasale } from './unwraps/shareasale.js'
export { unwrapSjv } from './unwraps/sjv.js'
export { unwrapSkimlinks } from './unwraps/skimlinks.js'
export { unwrapSlack } from './unwraps/slack.js'
export { unwrapSmartredirect } from './unwraps/smartredirect.js'
export { unwrapSspai } from './unwraps/sspai.js'
export { unwrapSteamLinkfilter } from './unwraps/steamLinkfilter.js'
export { unwrapTelegramIv } from './unwraps/telegramIv.js'
export { unwrapTradedoubler } from './unwraps/tradedoubler.js'
export { unwrapTumblr } from './unwraps/tumblr.js'
export { unwrapValuecommerce } from './unwraps/valuecommerce.js'
export { unwrapViglink } from './unwraps/viglink.js'
export { unwrapVkAway } from './unwraps/vkAway.js'
export { unwrapWebArchive } from './unwraps/webArchive.js'
export { unwrapYahooSearch } from './unwraps/yahooSearch.js'
export { unwrapYandexTurbo } from './unwraps/yandexTurbo.js'
export { unwrapYouTube } from './unwraps/youtube.js'
export { unwrapZhihu } from './unwraps/zhihu.js'
export type { ParamExtractorConfig } from './utils.js'
export { chooseBaseUrl, coerceNumber, createParamExtractor } from './utils.js'
