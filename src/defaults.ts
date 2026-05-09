import { youtubeEmbedResolver } from './embeds/youtube.js'
import { extractAmpCache } from './redirects/ampCache.js'
import { extractFacebookShim } from './redirects/facebook.js'
import { extractFeedsportal } from './redirects/feedsportal.js'
import { extractGoogleRedirect } from './redirects/google.js'
import { extractGoogleNewsRedirect } from './redirects/googleNews.js'
import { extractGoogleNewsModern } from './redirects/googleNewsModern.js'
import { extractGoogleTranslateRedirect } from './redirects/googleTranslate.js'
import { extractPocketRedirect } from './redirects/pocket.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { injectEnclosureEmbedPlaceholders } from './transforms/dom/injectEnclosureEmbedPlaceholders.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripParagraphBoundaryBreaks } from './transforms/dom/stripParagraphBoundaryBreaks.js'
import { stripTrackingParams } from './transforms/dom/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapRedirectUrls } from './transforms/dom/unwrapRedirectUrls.js'
import { decodeDoubleEncodedTags } from './transforms/string/decodeDoubleEncodedTags.js'
import { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
import { stripEmptyTags } from './transforms/string/stripEmptyTags.js'
import { stripOrphanedClosingTags } from './transforms/string/stripOrphanedClosingTags.js'
import { unwrapWrappers } from './transforms/string/unwrapWrappers.js'
import type { DomTransform, EmbedResolver, RedirectExtractor, StringTransform } from './types.js'

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

export const defaultEmbedResolvers: Array<EmbedResolver> = [youtubeEmbedResolver]

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
  extractGoogleNewsModern,
  extractGoogleTranslateRedirect,
  extractPocketRedirect,
  extractFacebookShim,
  extractAmpCache,
  extractFeedsportal,
]
