import {
  defaultAllDomTransforms,
  defaultAvatarImageHosts,
  defaultCiteResolvers,
  defaultDeferredIframeSources,
  defaultEmojiImageHosts,
  defaultGalleryResolvers,
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
  defaultWidgetResolvers,
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
    widgetResolvers: options.widgetResolvers ?? defaultWidgetResolvers,
    citeResolvers: options.citeResolvers ?? defaultCiteResolvers,
    galleryResolvers: options.galleryResolvers ?? defaultGalleryResolvers,
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
    parseDateFn: options.parseDateFn,
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
export { acastEmbedResolver } from './embeds/acast.js'
export { anchorEmbedResolver } from './embeds/anchor.js'
export { appleEmbedResolver } from './embeds/apple.js'
export {
  archiveFlashEmbedResolver,
  archiveIframeEmbedResolver,
} from './embeds/archive.js'
export { audioboomEmbedResolver } from './embeds/audioboom.js'
export { bandcampEmbedResolver } from './embeds/bandcamp.js'
export { bloggerEmbedResolver } from './embeds/blogger.js'
export { blubrryEmbedResolver } from './embeds/blubrry.js'
export {
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
} from './embeds/brightcove.js'
export {
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
} from './embeds/buzzsprout.js'
export { captivateEmbedResolver } from './embeds/captivate.js'
export { dailymotionEmbedResolver } from './embeds/dailymotion.js'
export { firesideEmbedResolver } from './embeds/fireside.js'
export { flickrEmbedResolver } from './embeds/flickr.js'
export { flourishEmbedResolver } from './embeds/flourish.js'
export { geniallyEmbedResolver } from './embeds/genially.js'
export {
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
} from './embeds/imgur.js'
export {
  issuuIframeEmbedResolver,
  issuuWidgetEmbedResolver,
} from './embeds/issuu.js'
export { ivooxEmbedResolver } from './embeds/ivoox.js'
export {
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
} from './embeds/jwplayer.js'
export { libsynEmbedResolver } from './embeds/libsyn.js'
export { mediavineEmbedResolver } from './embeds/mediavine.js'
export { megaphoneEmbedResolver } from './embeds/megaphone.js'
export { mixcloudEmbedResolver } from './embeds/mixcloud.js'
export {
  nicovideoIframeEmbedResolver,
  nicovideoScriptEmbedResolver,
} from './embeds/nicovideo.js'
export { omnyEmbedResolver } from './embeds/omny.js'
export { podbeanEmbedResolver } from './embeds/podbean.js'
export { podigeeEmbedResolver } from './embeds/podigee.js'
export { redditIframeEmbedResolver, redditWidgetEmbedResolver } from './embeds/reddit.js'
export { scribdFlashEmbedResolver, scribdIframeEmbedResolver } from './embeds/scribd.js'
export { simplecastEmbedResolver } from './embeds/simplecast.js'
export {
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
} from './embeds/slideshare.js'

export { soundcloudEmbedResolver } from './embeds/soundcloud.js'
export {
  speakerdeckIframeEmbedResolver,
  speakerdeckScriptEmbedResolver,
} from './embeds/speakerdeck.js'
export { spotifyEmbedResolver } from './embeds/spotify.js'
export {
  spreakerAnchorEmbedResolver,
  spreakerIframeEmbedResolver,
} from './embeds/spreaker.js'
export { tedEmbedResolver } from './embeds/ted.js'
export {
  telegramIframeEmbedResolver,
  telegramScriptEmbedResolver,
} from './embeds/telegram.js'
export { transistorEmbedResolver } from './embeds/transistor.js'
export {
  typeformIframeEmbedResolver,
  typeformWidgetEmbedResolver,
} from './embeds/typeform.js'
export { vimeoEmbedResolver } from './embeds/vimeo.js'
export { wistiaEmbedResolver } from './embeds/wistia.js'
export {
  composeThumbnailUrl,
  youtubeAmpEmbedResolver,
  youtubeIframeEmbedResolver,
} from './embeds/youtube.js'
export { coblocksGalleryResolver } from './galleries/coblocks.js'
export { ghostGalleryResolver } from './galleries/ghost.js'
export { jetpackSlideshowResolver } from './galleries/jetpack.js'
export { wordpressGalleryResolver } from './galleries/wordpress.js'
export { hljsHighlightFn } from './highlighters/hljs.js'
export { discourseMediaResolver } from './media/discourse.js'
export { ghostMediaResolver } from './media/ghost.js'
export { podloveMediaResolver } from './media/podlove.js'
export { substackMediaResolver } from './media/substack.js'
export { wechatMediaResolver } from './media/wechat.js'
export { weeblyMediaResolver } from './media/weebly.js'
export { assignVideoPosters } from './transforms/dom/assignVideoPosters.js'
export { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
export { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
export { convertAmpNativeElements } from './transforms/dom/convertAmpNativeElements.js'
export { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
export { convertCiteCards } from './transforms/dom/convertCiteCards.js'
export { convertDatawrapperEmbeds } from './transforms/dom/convertDatawrapperEmbeds.js'
export { convertGalleries } from './transforms/dom/convertGalleries.js'
export { convertGiphyEmbeds } from './transforms/dom/convertGiphyEmbeds.js'
export { convertLazyImageContainers } from './transforms/dom/convertLazyImageContainers.js'
export { convertNoteEmbeds } from './transforms/dom/convertNoteEmbeds.js'
export { convertWidgets } from './transforms/dom/convertWidgets.js'
export { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
export { demoteHeadings } from './transforms/dom/demoteHeadings.js'
export { enrichCitePlaceholders } from './transforms/dom/enrichCitePlaceholders.js'
export { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
export { fixLazyAudios } from './transforms/dom/fixLazyAudios.js'
export { fixLazyIframes } from './transforms/dom/fixLazyIframes.js'
export { fixLazyImages } from './transforms/dom/fixLazyImages.js'
export { fixLazyVideos } from './transforms/dom/fixLazyVideos.js'
export { fixSubstackImageLinks } from './transforms/dom/fixSubstackImageLinks.js'
export { fixSubstackMentions } from './transforms/dom/fixSubstackMentions.js'
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
export { rebuildVideoJsEmbeds } from './transforms/dom/rebuildVideoJsEmbeds.js'
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
export { stripDuplicateLeadingImages } from './transforms/dom/stripDuplicateLeadingImages.js'
export { stripDuplicateRules } from './transforms/dom/stripDuplicateRules.js'
export { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
export { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
export { stripHiddenElements } from './transforms/dom/stripHiddenElements.js'
export { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
export { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
export { stripMarkdownEscapeBackslashes } from './transforms/dom/stripMarkdownEscapeBackslashes.js'
export { stripNonContentElements } from './transforms/dom/stripNonContentElements.js'
export { stripWordBreaks } from './transforms/dom/stripWordBreaks.js'
export { surfaceNoscriptEmbeds } from './transforms/dom/surfaceNoscriptEmbeds.js'
export { surfaceParkedMarkup } from './transforms/dom/surfaceParkedMarkup.js'
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
  GalleryItem,
  GalleryResolver,
  GalleryResolverResult,
  HighlightFn,
  IsSafeUrlFn,
  MediaResolver,
  MediaResolverResult,
  ParseDateFn,
  ParseHtmlFn,
  ResolveUrlFn,
  StringTransform,
  TransformContentOptions,
  TransformContext,
  UrlRole,
  WidgetResolver,
  WidgetResolverResult,
} from './types.js'
export {
  type GeneratedWrapperType,
  generatedWrapperTypes,
  parsePixelSize,
} from './utils/dom.js'
export { applyDomTransforms, applyStringTransforms } from './utils/transforms.js'
export {
  createCitePlaceholder,
  createEmbedPlaceholder,
  createGalleryPlaceholder,
  createMarkupEmbedResolver,
  createPlaceholder,
  createUrlEmbedResolver,
  normalizeCiteFields,
  normalizeEmbedFields,
  updateCitePlaceholder,
  updateEmbedPlaceholder,
  updatePlaceholder,
} from './utils/widgets.js'
