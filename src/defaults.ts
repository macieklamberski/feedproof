import { resolveUrl } from 'feedcanon'
import { youtubeEmbedResolver } from './embeds/youtube.js'
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
import type {
  DomTransform,
  EmbedResolver,
  ResolveUrlFn,
  StringTransform,
  UrlUnwrapper,
} from './types.js'
import { unwrapBing } from './unwraps/bing.js'
import { unwrapFacebookShim } from './unwraps/facebook.js'
import { unwrapGoogle } from './unwraps/google.js'
import { unwrapGoogleAmpViewer } from './unwraps/googleAmpViewer.js'
import { unwrapGoogleNews } from './unwraps/googleNews.js'
import { unwrapGoogleNewsModern } from './unwraps/googleNewsModern.js'
import { unwrapGoogleScholar } from './unwraps/googleScholar.js'
import { unwrapInstagramShim } from './unwraps/instagram.js'
import { unwrapRedditOut } from './unwraps/redditOut.js'
import { unwrapVkAway } from './unwraps/vkAway.js'
import { unwrapYahooSearch } from './unwraps/yahooSearch.js'
import { unwrapYouTube } from './unwraps/youtube.js'

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

// Order matters when selectors overlap: each resolver runs in array order and
// claimed iframes can't be re-matched. Place more specific selectors (e.g.
// meta-providers like Embedly that wrap other providers) before broader ones.
export const defaultEmbedResolvers: Array<EmbedResolver> = [youtubeEmbedResolver]

export const defaultResolveUrlFn: ResolveUrlFn = (url, baseUrl) => resolveUrl(url, baseUrl)

export const defaultLazySrcAttributes = [
  'data-src', // lazysizes / vanilla-lazyload / lozad / Drupal Blazy / a3 Lazy Load / Smush / EWWW / generic — 360k hits.
  'data-original', // Legacy jquery_lazyload (tuupola v1) — 19k hits, large legacy footprint.
  'data-lazy-src', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load — 31k hits.
  'data-url', // Generic, observed across multiple lazy-loaders — 343k hits.
  'data-image', // Squarespace ImageLoader — 2M hits, the highest-volume real-world variant.
  'data-orig-file', // WordPress unscaled original (Jetpack media library) — 1.75M hits.
  'data-large-file', // WordPress responsive variant — 1.75M hits.
  'data-medium-file', // WordPress responsive medium fallback — 1.67M hits.
  'data-thumb', // WordPress thumbnail variant — 18k hits.
  'data-thumb-src', // WordPress thumbnail src variant — 11k hits.
  'data-original-src', // Legacy lazy-loaders / pika.page CDN — 9k hits.
  'data-image-src', // Legacy Atlassian-style CMS — 4k hits.
  'data-canonical-src', // YouTube / retina-aware renderers — 2k hits, <0.1% of feeds.
  'data-img-url', // Amazon affiliate widgets / generic — 0.9k hits, <0.1% of feeds.
  'data-orig', // Generic original-source variant — 27 hits, <0.01% of feeds.
  'data-runner-src', // Amazon affiliate / generic — 42 hits, <0.01% of feeds.
]

export const defaultTrackingHosts = [
  'feedsportal.com', // Postmedia/Newsfutures feed-syndication pixels (/c/<id>/<…>.gif).
  'stats.wordpress.com', // WordPress.com / Jetpack Stats pixels.
  'pixel.wp.com', // WordPress.com / Jetpack Stats pixels.
  'doubleclick.net', // Google ads tracking.
  'google-analytics.com', // Google Analytics measurement pixels.
  'list-manage.com', // Mailchimp opens.
  'feedburner.com', // FeedBurner flare pixels (/~ff/).
  'feedproxy.google.com', // FeedBurner-via-Google.
  'feedblitz.com', // FeedBlitz pixels.
  'mailerlite.com', // Newsletter platform.
  'convertkit-mail.com', // Newsletter platform.
  'beehiiv.com', // Newsletter platform.
  'email.medium.com', // Medium newsletter pixels.
  'stat-c.medium.com', // Medium reader-stat pixels.
  'googlesyndication.com', // Google AdSense ad pixels.
  'googletagmanager.com', // Google Tag Manager.
  'amazon-adsystem.com', // Amazon ad serving pixels.
  'taboola.com', // Content-recommendation widget pixels.
  'outbrain.com', // Content-recommendation widget pixels.
  'scorecardresearch.com', // Comscore audience-measurement pixels.
  'quantserve.com', // Quantcast measurement pixels.
  'chartbeat.com', // Chartbeat analytics pixels.
  'moatads.com', // Oracle Moat viewability pixels.
  'sentry.io', // Sentry error-monitoring beacons.
]

export const defaultTrackingPathSegments = ['pixel', 'beacon', 'count']

export const defaultUrlUnwrappers: Array<UrlUnwrapper> = [
  // Search engines.
  unwrapBing,
  unwrapGoogle,
  unwrapGoogleNews,
  unwrapGoogleNewsModern,
  unwrapGoogleScholar,
  unwrapGoogleAmpViewer,
  unwrapYahooSearch,
  unwrapYouTube,

  // Social and community platforms.
  unwrapFacebookShim,
  unwrapInstagramShim,
  unwrapVkAway,
  unwrapRedditOut,
]
