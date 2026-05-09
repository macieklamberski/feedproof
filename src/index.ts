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
export { extractAmpCache } from './redirects/ampCache.js'
export { extractFacebookShim } from './redirects/facebook.js'
export { extractGoogleRedirect } from './redirects/google.js'
export { extractGoogleNewsRedirect } from './redirects/googleNews.js'
export { extractGoogleNewsModern } from './redirects/googleNewsModern.js'
export { extractGoogleTranslateRedirect } from './redirects/googleTranslate.js'
export { extractPocketRedirect } from './redirects/pocket.js'
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
export { chooseBaseUrl, coerceNumber, createParamExtractor } from './utils.js'
export type { ParamExtractorConfig } from './utils.js'
