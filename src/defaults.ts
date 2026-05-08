import { youtubeEmbedHandler } from './embeds/youtube.js'
import { decodeDoubleEncodedTags } from './transforms/decodeDoubleEncodedTags.js'
import { fixLazyImages } from './transforms/fixLazyImages.js'
import { highlightCode } from './transforms/highlightCode.js'
import { injectEnclosureEmbedPlaceholders } from './transforms/injectEnclosureEmbedPlaceholders.js'
import { linkifyUrls } from './transforms/linkifyUrls.js'
import { mergeConsecutiveOneLinerPres } from './transforms/mergeConsecutiveOneLinerPres.js'
import { paragraphizePlainText } from './transforms/paragraphizePlainText.js'
import { removeTrackingPixels } from './transforms/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/resolveRelativeUrls.js'
import { stripComments } from './transforms/stripComments.js'
import { stripEmptyTags } from './transforms/stripEmptyTags.js'
import { stripInterBlockBreaks } from './transforms/stripInterBlockBreaks.js'
import { stripOrphanedClosingTags } from './transforms/stripOrphanedClosingTags.js'
import { stripParagraphBoundaryBreaks } from './transforms/stripParagraphBoundaryBreaks.js'
import { stripTrackingParams } from './transforms/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/trimPreWhitespace.js'
import {
  extractFacebookShim,
  extractGoogleNewsRedirect,
  extractGoogleRedirect,
  extractGoogleTranslateRedirect,
  extractPocketRedirect,
  unwrapRedirectUrls,
} from './transforms/unwrapRedirectUrls.js'
import { unwrapWrappers } from './transforms/unwrapWrappers.js'
import type { DomTransform, EmbedHandler, RedirectExtractor, StringTransform } from './types.js'

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

export const defaultEmbedHandlers: Array<EmbedHandler> = [youtubeEmbedHandler]

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
  extractGoogleRedirect,
  extractGoogleNewsRedirect,
  extractGoogleTranslateRedirect,
  extractPocketRedirect,
  extractFacebookShim,
]
