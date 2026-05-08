import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultDomTransforms,
  defaultFinalStringTransforms,
  defaultStringTransforms,
} from './defaults.js'
import type { TransformContentOptions, TransformContext } from './types.js'

export const transformContent = (html: string, options: TransformContentOptions = {}): string => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    embedHandlers: options.embedHandlers,
    lazySrcAttributes: options.lazySrcAttributes,
    trackingHosts: options.trackingHosts,
    trackingPathSegments: options.trackingPathSegments,
    redirectExtractors: options.redirectExtractors,
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
  youtubeEmbedHandler,
  youtubeResolveEmbed,
} from './embeds/youtube.js'
export { decodeDoubleEncodedTags } from './transforms/decodeDoubleEncodedTags.js'
export { fixLazyImages } from './transforms/fixLazyImages.js'
export { detectLanguage, highlightCode } from './transforms/highlightCode.js'
export { injectEnclosureEmbedPlaceholders } from './transforms/injectEnclosureEmbedPlaceholders.js'
export { linkifyUrls } from './transforms/linkifyUrls.js'
export { mergeConsecutiveOneLinerPres } from './transforms/mergeConsecutiveOneLinerPres.js'
export { paragraphizePlainText } from './transforms/paragraphizePlainText.js'
export { removeTrackingPixels } from './transforms/removeTrackingPixels.js'
export { replaceEmbedsWithPlaceholders } from './transforms/replaceEmbedsWithPlaceholders.js'
export { replacePreLineBreaks } from './transforms/replacePreLineBreaks.js'
export { resolveRelativeUrls } from './transforms/resolveRelativeUrls.js'
export { simplifyFigures } from './transforms/simplifyFigures.js'
export { stripComments } from './transforms/stripComments.js'
export { stripEmptyTags } from './transforms/stripEmptyTags.js'
export { stripInterBlockBreaks } from './transforms/stripInterBlockBreaks.js'
export { stripOrphanedClosingTags } from './transforms/stripOrphanedClosingTags.js'
export { stripParagraphBoundaryBreaks } from './transforms/stripParagraphBoundaryBreaks.js'
export { stripTrackingParams } from './transforms/stripTrackingParams.js'
export { trimPreWhitespace } from './transforms/trimPreWhitespace.js'
export { extractRedirectTarget, unwrapRedirectUrls } from './transforms/unwrapRedirectUrls.js'
export { unwrapWrappers } from './transforms/unwrapWrappers.js'
export type {
  DomTransform,
  EmbedHandler,
  EmbedResolverResult,
  Enclosure,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'
export { chooseBaseUrl, coerceNumber } from './utils.js'
