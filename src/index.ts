import { applyDomTransforms, applyStringTransforms } from './common.js'
import {
  defaultDomTransforms,
  defaultEmbedDomains,
  defaultResolveEmbed,
  defaultStringTransforms,
} from './defaults.js'
import type {
  DomTransform,
  StringTransform,
  TransformContentOptions,
  TransformContext,
} from './types.js'

const filterStringTransforms = (
  transforms: Array<StringTransform>,
  toggles?: TransformContentOptions['transforms'],
): Array<StringTransform> => {
  if (!toggles) {
    return transforms
  }

  return transforms.filter((transform) => {
    const name = transform.name as keyof NonNullable<TransformContentOptions['transforms']>
    return toggles[name] !== false
  })
}

const filterDomTransforms = (
  transforms: Array<DomTransform>,
  toggles?: TransformContentOptions['transforms'],
): Array<DomTransform> => {
  if (!toggles) {
    return transforms
  }

  return transforms.filter((transform) => {
    const name = transform.name as keyof NonNullable<TransformContentOptions['transforms']>
    return toggles[name] !== false
  })
}

export const transformContent = (html: string, options: TransformContentOptions = {}): string => {
  const context: TransformContext = {
    baseUrl: options.baseUrl,
    enclosures: options.enclosures,
    resolveEmbed: options.resolveEmbed ?? defaultResolveEmbed,
    embedDomains: options.embedDomains ?? defaultEmbedDomains,
  }

  // Phase 1: String transforms.
  const stringFns = filterStringTransforms(defaultStringTransforms, options.transforms)
  const afterString = applyStringTransforms(
    html,
    stringFns.map((transform) => transform(context)),
  )

  // Phase 2: DOM transforms.
  const domFns = filterDomTransforms(defaultDomTransforms, options.transforms)
  const afterDom = applyDomTransforms(
    afterString,
    domFns.map((transform) => transform(context)),
  )

  return afterDom
}

export {
  applyDomTransforms,
  applyStringTransforms,
  createEmbedPlaceholder,
  parseFragment,
  stripOversizedBase64Sources,
  transformHtml,
} from './common.js'
export { soundcloudEmbedDomains } from './platforms/soundcloud.js'
export { spotifyEmbedDomains } from './platforms/spotify.js'
export { vimeoEmbedDomains } from './platforms/vimeo.js'
export {
  composeThumbnailUrl,
  extractVideoId,
  youtubeEmbedDomains,
  youtubeResolveEmbed,
} from './platforms/youtube.js'
export { decodeDoubleEncodedTags } from './transforms/decodeDoubleEncodedTags.js'
export { fixLazyImages } from './transforms/fixLazyImages.js'
export { detectLanguage, highlightCode } from './transforms/highlightCode.js'
export { injectEnclosureEmbedPlaceholders } from './transforms/injectEnclosureEmbedPlaceholders.js'
export { linkifyUrls } from './transforms/linkifyUrls.js'
export { mergeConsecutiveOneLinerPres } from './transforms/mergeConsecutiveOneLinerPres.js'
export { paragraphizePlainText } from './transforms/paragraphizePlainText.js'
export { removeTrackingPixels } from './transforms/removeTrackingPixels.js'
export { replaceMediaWithEmbedPlaceholders } from './transforms/replaceMediaWithEmbedPlaceholders.js'
export { replacePreLineBreaks } from './transforms/replacePreLineBreaks.js'
export { resolveRelativeUrls } from './transforms/resolveRelativeUrls.js'
export { simplifyFigures } from './transforms/simplifyFigures.js'
export { stripInterBlockBreaks } from './transforms/stripInterBlockBreaks.js'
export { stripTrackingParams } from './transforms/stripTrackingParams.js'
export { trimPreWhitespace } from './transforms/trimPreWhitespace.js'
export { extractRedirectTarget, unwrapRedirectUrls } from './transforms/unwrapRedirectUrls.js'
export { unwrapWrappers } from './transforms/unwrapWrappers.js'
export type {
  DomTransform,
  EmbedResolverResult,
  Enclosure,
  StringTransform,
  TransformContentOptions,
  TransformContext,
  TransformToggles,
} from './types.js'
export { chooseBaseUrl, coerceNumber } from './utils.js'
