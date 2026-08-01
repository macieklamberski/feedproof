import {
  defaultAllDomTransforms,
  defaultAvatarImageHosts,
  defaultCiteResolvers,
  defaultDeferredIframeSources,
  defaultEmbedResolvers,
  defaultEmojiImageHosts,
  defaultHighlightFn,
  defaultLazyIframeAttributes,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultMediaSrcAttributes,
  defaultNonContentSelectors,
  defaultPreservedPreClasses,
  defaultResolveUrlFn,
  defaultStandardDomTransforms,
  defaultStringTransforms,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
} from './defaults.js'
import type { TransformContentOptions, TransformContext } from './types.js'
import { applyDomTransforms, applyStringTransforms } from './utils/transforms.js'

export const transformContent = async (
  html: string,
  options: TransformContentOptions,
): Promise<string> => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    sameSiteUrls: options.sameSiteUrls,
    enclosures: options.enclosures,
    embedResolvers: options.embedResolvers ?? defaultEmbedResolvers,
    citeResolvers: options.citeResolvers ?? defaultCiteResolvers,
    mediaSrcAttributes: options.mediaSrcAttributes ?? defaultMediaSrcAttributes,
    lazySrcAttributes: options.lazySrcAttributes ?? defaultLazySrcAttributes,
    lazySrcsetAttributes: options.lazySrcsetAttributes ?? defaultLazySrcsetAttributes,
    lazyIframeAttributes: options.lazyIframeAttributes ?? defaultLazyIframeAttributes,
    deferredIframeSources: options.deferredIframeSources ?? defaultDeferredIframeSources,
    trackingHosts: options.trackingHosts ?? defaultTrackingHosts,
    trackingPathSegments: options.trackingPathSegments ?? defaultTrackingPathSegments,
    emojiImageHosts: options.emojiImageHosts ?? defaultEmojiImageHosts,
    avatarImageHosts: options.avatarImageHosts ?? defaultAvatarImageHosts,
    nonContentSelectors: options.nonContentSelectors ?? defaultNonContentSelectors,
    preservedPreClasses: options.preservedPreClasses ?? defaultPreservedPreClasses,
    resolveUrlFn: options.resolveUrlFn ?? defaultResolveUrlFn,
    cleanUrlFn: options.cleanUrlFn,
    assetProxyFn: options.assetProxyFn,
    isSafeUrlFn: options.isSafeUrlFn,
    enrichEmbedFn: options.enrichEmbedFn,
    enrichCiteFn: options.enrichCiteFn,
    highlightFn: options.highlightFn ?? defaultHighlightFn,
    articleTitle: options.articleTitle,
  }

  const stringFns = options.stringTransforms ?? defaultStringTransforms
  const domFns =
    options.domTransforms ??
    (options.heuristics ? defaultAllDomTransforms : defaultStandardDomTransforms)

  const afterString = await applyStringTransforms(
    html,
    stringFns.map((transform) => transform(context)),
  )

  const document = await options.parseHtmlFn(afterString)
  const afterDom = await applyDomTransforms(
    document,
    domFns.map((transform) => transform(context)),
  )

  return afterDom
}

export { affingerCiteResolver } from './cites/affinger.js'
export { amebaCiteResolver } from './cites/ameba.js'
export { blogCardCiteResolver } from './cites/blogcard.js'
export { cocoonCiteResolver } from './cites/cocoon.js'
export {
  devtoLegacyPostCiteResolver,
  devtoLinkCiteResolver,
  devtoPostCiteResolver,
} from './cites/devto.js'
export { discourseCiteResolver } from './cites/discourse.js'
export { embedlyCiteResolver } from './cites/embedly.js'
export { ghostCiteResolver } from './cites/ghost.js'
export { hatenaCiteResolver } from './cites/hatena.js'
export { mediumCiteResolver } from './cites/medium.js'
export { microformatsCiteResolver } from './cites/microformats.js'
export { nodebbCiteResolver } from './cites/nodebb.js'
export { notecomCiteResolver } from './cites/notecom.js'
export { paragraphCiteResolver } from './cites/paragraph.js'
export { pzlinkcardCiteResolver } from './cites/pzlinkcard.js'
export {
  substackCrossPostCiteResolver,
  substackOwnPostCiteResolver,
} from './cites/substack.js'
export { swellCiteResolver } from './cites/swell.js'
export { tcdCiteResolver } from './cites/tcd.js'
export { tistoryCiteResolver } from './cites/tistory.js'
export { tumblrCiteResolver } from './cites/tumblr.js'
export { xenforoCiteResolver } from './cites/xenforo.js'
export {
  defaultAllDomTransforms,
  defaultHighlightFn,
  defaultResolveUrlFn,
  defaultStandardDomTransforms,
  heuristicDomTransforms,
} from './defaults.js'
export {
  dailymotionEmbedResolver,
  dailymotionResolveEmbed,
  extractDailymotionId,
} from './embeds/dailymotion.js'
export {
  extractJwplayerId,
  jwplayerEmbedResolver,
  jwplayerResolveEmbed,
} from './embeds/jwplayer.js'
export {
  extractVimeoId,
  vimeoEmbedResolver,
  vimeoResolveEmbed,
} from './embeds/vimeo.js'
export {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedResolver,
  youtubeResolveEmbed,
} from './embeds/youtube.js'
export { hljsHighlightFn } from './highlighters/hljs.js'
export { amebaMediaResolver } from './media/ameba.js'
export { substackMediaResolver } from './media/substack.js'
export { wechatMediaResolver } from './media/wechat.js'
export { assignVideoPosters } from './transforms/dom/assignVideoPosters.js'
export { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
export { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
export { convertAmpElements } from './transforms/dom/convertAmpElements.js'
export { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
export { convertCiteCards } from './transforms/dom/convertCiteCards.js'
export { convertDatawrapperEmbeds } from './transforms/dom/convertDatawrapperEmbeds.js'
export { convertLazyImageContainers } from './transforms/dom/convertLazyImageContainers.js'
export { convertWidgets } from './transforms/dom/convertWidgets.js'
export { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
export { demoteHeadings } from './transforms/dom/demoteHeadings.js'
export { enrichCitePlaceholders } from './transforms/dom/enrichCitePlaceholders.js'
export { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
export { fixLazyAudios } from './transforms/dom/fixLazyAudios.js'
export { fixLazyIframes } from './transforms/dom/fixLazyIframes.js'
export { fixLazyImages } from './transforms/dom/fixLazyImages.js'
export { fixLazyVideos } from './transforms/dom/fixLazyVideos.js'
export { flattenPictureElements } from './transforms/dom/flattenPictureElements.js'
export { detectLanguage, highlightCode } from './transforms/dom/highlightCode.js'
export { hoistBlocksFromParagraphs } from './transforms/dom/hoistBlocksFromParagraphs.js'
export { hoistFigcaptionFromAnchor } from './transforms/dom/hoistFigcaptionFromAnchor.js'
export { injectEnclosures } from './transforms/dom/injectEnclosures.js'
export { linkifyGistEmbeds } from './transforms/dom/linkifyGistEmbeds.js'
export { linkifyUrls } from './transforms/dom/linkifyUrls.js'
export { markTimestamps, parseTimestampSeconds } from './transforms/dom/markTimestamps.js'
export { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
export { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
export { neutralizeUnsafeUrls } from './transforms/dom/neutralizeUnsafeUrls.js'
export { normalizeAnchoredHeadings } from './transforms/dom/normalizeAnchoredHeadings.js'
export { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
export { rebuildDeferredIframes } from './transforms/dom/rebuildDeferredIframes.js'
export { rebuildElementorVideoEmbeds } from './transforms/dom/rebuildElementorVideoEmbeds.js'
export { rebuildEmbedlyEmbeds } from './transforms/dom/rebuildEmbedlyEmbeds.js'
export { rebuildEmbedPlusEmbeds } from './transforms/dom/rebuildEmbedPlusEmbeds.js'
export { rebuildLazyLoadForVideos } from './transforms/dom/rebuildLazyLoadForVideos.js'
export { rebuildLazyYtEmbeds } from './transforms/dom/rebuildLazyYtEmbeds.js'
export { rebuildLiteVideoEmbeds } from './transforms/dom/rebuildLiteVideoEmbeds.js'
export { rebuildLyteEmbeds } from './transforms/dom/rebuildLyteEmbeds.js'
export { rebuildRocketYoutubePreviews } from './transforms/dom/rebuildRocketYoutubePreviews.js'
export { rebuildWistiaEmbeds } from './transforms/dom/rebuildWistiaEmbeds.js'
export { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
export { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
export { resolveMediaDimensions } from './transforms/dom/resolveMediaDimensions.js'
export { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
export { shortenSamePageLinkFragments } from './transforms/dom/shortenSamePageLinkFragments.js'
export { stripBoundaryBreaks } from './transforms/dom/stripBoundaryBreaks.js'
export { stripComments } from './transforms/dom/stripComments.js'
export { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
export { stripDuplicateEnclosures } from './transforms/dom/stripDuplicateEnclosures.js'
export { stripDuplicateRules } from './transforms/dom/stripDuplicateRules.js'
export { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
export { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
export { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
export { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
export { stripNonContentElements } from './transforms/dom/stripNonContentElements.js'
export { surfaceNoscriptEmbeds } from './transforms/dom/surfaceNoscriptEmbeds.js'
export { surfaceTemplateEmbeds } from './transforms/dom/surfaceTemplateEmbeds.js'
export { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
export { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
export { unwrapEmojiImages } from './transforms/dom/unwrapEmojiImages.js'
export { unwrapHeadingBold } from './transforms/dom/unwrapHeadingBold.js'
export { unwrapNestedCodeWrappers } from './transforms/dom/unwrapNestedCodeWrappers.js'
export { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
export { wrapBareInlineInParagraphs } from './transforms/dom/wrapBareInlineInParagraphs.js'
export { wrapCargoGalleryImages } from './transforms/dom/wrapCargoGalleryImages.js'
export { wrapTablesForScroll } from './transforms/dom/wrapTablesForScroll.js'
export { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
export { stripControlChars } from './transforms/string/stripControlChars.js'
export { stripOversizedBase64Sources } from './transforms/string/stripOversizedBase64Sources.js'
export { unwrapCdataComments } from './transforms/string/unwrapCdataComments.js'
export { unwrapCdataMarkers } from './transforms/string/unwrapCdataMarkers.js'
export type {
  AssetProxyFn,
  AssetType,
  CiteKind,
  CiteResolver,
  CiteResolverResult,
  CleanUrlFn,
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  EnrichCiteFn,
  EnrichEmbedFn,
  HighlightFn,
  IsSafeUrlFn,
  MediaResolver,
  MediaResolverResult,
  ParseHtmlFn,
  ResolveUrlFn,
  StringTransform,
  TransformContentOptions,
  TransformContext,
  UrlRole,
  WidgetResolver,
  WidgetResolverResult,
} from './types.js'
export { type GeneratedWrapperType, generatedWrapperTypes } from './utils/dom.js'
export { applyDomTransforms, applyStringTransforms } from './utils/transforms.js'
export {
  createCitePlaceholder,
  createEmbedPlaceholder,
  createIframeEmbedResolver,
  createPlaceholder,
  normalizeCiteFields,
  normalizeEmbedFields,
  updateCitePlaceholder,
  updateEmbedPlaceholder,
  updatePlaceholder,
} from './utils/widgets.js'
