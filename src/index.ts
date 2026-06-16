import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultBookmarkResolvers,
  defaultDomTransforms,
  defaultEmbedResolvers,
  defaultEmojiImageHosts,
  defaultInertSelectors,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultPreservedPreClasses,
  defaultResolveUrlFn,
  defaultStringTransforms,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
} from './defaults.js'
import type { TransformContentOptions, TransformContext } from './types.js'

export const transformContent = async (
  html: string,
  options: TransformContentOptions,
): Promise<string> => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    embedResolvers: options.embedResolvers ?? defaultEmbedResolvers,
    bookmarkResolvers: options.bookmarkResolvers ?? defaultBookmarkResolvers,
    lazySrcAttributes: options.lazySrcAttributes ?? defaultLazySrcAttributes,
    lazySrcsetAttributes: options.lazySrcsetAttributes ?? defaultLazySrcsetAttributes,
    trackingHosts: options.trackingHosts ?? defaultTrackingHosts,
    trackingPathSegments: options.trackingPathSegments ?? defaultTrackingPathSegments,
    emojiImageHosts: options.emojiImageHosts ?? defaultEmojiImageHosts,
    inertSelectors: options.inertSelectors ?? defaultInertSelectors,
    preservedPreClasses: options.preservedPreClasses ?? defaultPreservedPreClasses,
    resolveUrlFn: options.resolveUrlFn ?? defaultResolveUrlFn,
    cleanUrlFn: options.cleanUrlFn,
    assetProxyFn: options.assetProxyFn,
    enrichEmbedFn: options.enrichEmbedFn,
    articleTitle: options.articleTitle,
  }

  const stringFns = options.stringTransforms ?? defaultStringTransforms
  const domFns = options.domTransforms ?? defaultDomTransforms

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

export { ghostBookmarkResolver } from './bookmarks/ghost.js'
export { substackBookmarkResolver } from './bookmarks/substack.js'
export {
  applyDomTransforms,
  applyStringTransforms,
  createBookmarkPlaceholder,
  createEmbedPlaceholder,
  createPlaceholder,
  isSafeThumbnailUrl,
  normalizeEmbedFields,
  updateEmbedPlaceholder,
} from './common.js'
export { defaultResolveUrlFn } from './defaults.js'
export {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedResolver,
  youtubeResolveEmbed,
} from './embeds/youtube.js'
export { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
export { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
export { convertBookmarkCards } from './transforms/dom/convertBookmarkCards.js'
export { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
export { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
export { demoteHeadings } from './transforms/dom/demoteHeadings.js'
export { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
export { fixLazyImages } from './transforms/dom/fixLazyImages.js'
export { flattenPictureElements } from './transforms/dom/flattenPictureElements.js'
export { detectLanguage, highlightCode } from './transforms/dom/highlightCode.js'
export { hoistFigcaptionFromAnchor } from './transforms/dom/hoistFigcaptionFromAnchor.js'
export { injectEnclosures } from './transforms/dom/injectEnclosures.js'
export { linkifyUrls } from './transforms/dom/linkifyUrls.js'
export { markTimestamps, parseTimestampSeconds } from './transforms/dom/markTimestamps.js'
export { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
export { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
export { normalizeAnchoredHeadings } from './transforms/dom/normalizeAnchoredHeadings.js'
export { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
export { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
export { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
export { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
export { resolveMediaDimensions } from './transforms/dom/resolveMediaDimensions.js'
export { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
export { shortenSamePageLinkFragments } from './transforms/dom/shortenSamePageLinkFragments.js'
export { stripBoundaryBreaks } from './transforms/dom/stripBoundaryBreaks.js'
export { stripComments } from './transforms/dom/stripComments.js'
export { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
export { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
export { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
export { stripInertElements } from './transforms/dom/stripInertElements.js'
export { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
export { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
export { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
export { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
export { unwrapEmojiImages } from './transforms/dom/unwrapEmojiImages.js'
export { unwrapHeadingBold } from './transforms/dom/unwrapHeadingBold.js'
export { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
export { wrapBareInlineInParagraphs } from './transforms/dom/wrapBareInlineInParagraphs.js'
export { wrapTablesForScroll } from './transforms/dom/wrapTablesForScroll.js'
export { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
export { stripControlChars } from './transforms/string/stripControlChars.js'
export { stripOversizedBase64Sources } from './transforms/string/stripOversizedBase64Sources.js'
export { unwrapCdataComments } from './transforms/string/unwrapCdataComments.js'
export { unwrapCdataMarkers } from './transforms/string/unwrapCdataMarkers.js'
export type {
  AssetProxyFn,
  AssetType,
  BookmarkResolver,
  BookmarkResolverResult,
  CleanUrlFn,
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  EnrichEmbedFn,
  MaybePromise,
  ParseHtmlFn,
  ResolveUrlFn,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'
export { chooseBaseUrl, coerceNumber } from './utils.js'
