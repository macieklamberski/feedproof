import { soundcloudEmbedDomains } from './platforms/soundcloud.js'
import { spotifyEmbedDomains } from './platforms/spotify.js'
import { vimeoEmbedDomains } from './platforms/vimeo.js'
import { youtubeEmbedDomains, youtubeResolveEmbed } from './platforms/youtube.js'
import { convertBreaksToParagraphs } from './transforms/convertBreaksToParagraphs.js'
import { decodeDoubleEncodedTags } from './transforms/decodeDoubleEncodedTags.js'
import { fixLazyImages } from './transforms/fixLazyImages.js'
import { highlightCode } from './transforms/highlightCode.js'
import { injectEnclosureEmbedPlaceholders } from './transforms/injectEnclosureEmbedPlaceholders.js'
import { linkifyUrls } from './transforms/linkifyUrls.js'
import { mergeConsecutiveOneLinerPres } from './transforms/mergeConsecutiveOneLinerPres.js'
import { paragraphizePlainText } from './transforms/paragraphizePlainText.js'
import { removeTrackingPixels } from './transforms/removeTrackingPixels.js'
import { replaceMediaWithEmbedPlaceholders } from './transforms/replaceMediaWithEmbedPlaceholders.js'
import { replacePreLineBreaks } from './transforms/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/resolveRelativeUrls.js'
import { stripEmptyTags } from './transforms/stripEmptyTags.js'
import { stripInterBlockBreaks } from './transforms/stripInterBlockBreaks.js'
import { stripOrphanedClosingTags } from './transforms/stripOrphanedClosingTags.js'
import { stripTrackingParams } from './transforms/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/trimPreWhitespace.js'
import { unwrapRedirectUrls } from './transforms/unwrapRedirectUrls.js'
import { unwrapWrappers } from './transforms/unwrapWrappers.js'
import type { DomTransform, EmbedResolverResult, StringTransform } from './types.js'

export const defaultStringTransforms: Array<StringTransform> = [
  stripOrphanedClosingTags,
  decodeDoubleEncodedTags,
  unwrapWrappers,
  paragraphizePlainText,
  stripEmptyTags,
]

export const defaultDomTransforms: Array<DomTransform> = [
  fixLazyImages,
  resolveRelativeUrls,
  unwrapRedirectUrls,
  stripTrackingParams,
  removeTrackingPixels,
  convertBreaksToParagraphs,
  stripInterBlockBreaks,
  highlightCode,
  mergeConsecutiveOneLinerPres,
  replacePreLineBreaks,
  trimPreWhitespace,
  linkifyUrls,
  replaceMediaWithEmbedPlaceholders,
  injectEnclosureEmbedPlaceholders,
]

export const defaultEmbedDomains: Array<string> = [
  ...youtubeEmbedDomains,
  ...vimeoEmbedDomains,
  ...spotifyEmbedDomains,
  ...soundcloudEmbedDomains,
]

export const defaultResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  return youtubeResolveEmbed(url)
}

export { defaultLazySrcAttributes } from './transforms/fixLazyImages.js'
export {
  defaultTrackingHosts,
  defaultTrackingPathSegments,
} from './transforms/removeTrackingPixels.js'
export { defaultRedirectExtractors } from './transforms/unwrapRedirectUrls.js'
