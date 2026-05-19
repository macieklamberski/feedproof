import { resolveUrl } from 'feedcanon'
import { youtubeEmbedResolver } from './embeds/youtube.js'
import { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
import { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { injectEnclosures } from './transforms/dom/injectEnclosures.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
import { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
import { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
import { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripParagraphBoundaryBreaks } from './transforms/dom/stripParagraphBoundaryBreaks.js'
import { stripTrackingParams } from './transforms/dom/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
import { unwrapRedirectUrls } from './transforms/dom/unwrapRedirectUrls.js'
import { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
import { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
import { unwrapCdataComments } from './transforms/string/unwrapCdataComments.js'
import type {
  DomTransform,
  EmbedResolver,
  ResolveUrlFn,
  StringTransform,
  UrlUnwrapper,
} from './types.js'
// import { unwrapAceml } from './unwraps/aceml.js'
// import { unwrapAdjust } from './unwraps/adjust.js'
// import { unwrapAmazonAffiliate } from './unwraps/amazonAffiliate.js'
// import { unwrapAmpCache } from './unwraps/ampCache.js'
// import { unwrapAwin } from './unwraps/awin.js'
import { unwrapBing } from './unwraps/bing.js'
// import { unwrapCjNetwork } from './unwraps/cjNetwork.js'
// import { unwrapDigidip } from './unwraps/digidip.js'
// import { unwrapDisqus } from './unwraps/disqus.js'
// import { unwrapDouban } from './unwraps/douban.js'
// import { unwrapDuckduckgo } from './unwraps/duckduckgo.js'
// import { unwrapEbayRover } from './unwraps/ebayRover.js'
// import { unwrapEffiliation } from './unwraps/effiliation.js'
// import { unwrapEmbedly } from './unwraps/embedly.js'
import { unwrapFacebookShim } from './unwraps/facebook.js'
// import { unwrapFeedsportal } from './unwraps/feedsportal.js'
// import { unwrapFirebaseDynamicLinks } from './unwraps/firebaseDynamicLinks.js'
// import { unwrapFlipboard } from './unwraps/flipboard.js'
// import { unwrapGateSc } from './unwraps/gateSc.js'
// import { unwrapGeoriot } from './unwraps/georiot.js'
// import { unwrapGitee } from './unwraps/gitee.js'
import { unwrapGoogle } from './unwraps/google.js'
import { unwrapGoogleAmpViewer } from './unwraps/googleAmpViewer.js'
import { unwrapGoogleNews } from './unwraps/googleNews.js'
import { unwrapGoogleNewsModern } from './unwraps/googleNewsModern.js'
import { unwrapGoogleScholar } from './unwraps/googleScholar.js'
// import { unwrapHashnode } from './unwraps/hashnode.js'
// import { unwrapIcptrack } from './unwraps/icptrack.js'
// import { unwrapIdealoPartner } from './unwraps/idealoPartner.js'
import { unwrapInstagramShim } from './unwraps/instagram.js'
// import { unwrapJianshuGo } from './unwraps/jianshuGo.js'
// import { unwrapJuejin } from './unwraps/juejin.js'
// import { unwrapLeverAnalytics } from './unwraps/leverAnalytics.js'
// import { unwrapLinksynergy } from './unwraps/linksynergy.js'
// import { unwrapMailchimp } from './unwraps/mailchimp.js'
// import { unwrapMailpanion } from './unwraps/mailpanion.js'
// import { unwrapMailpgn } from './unwraps/mailpgn.js'
// import { unwrapMailtrack } from './unwraps/mailtrack.js'
// import { unwrapMedium } from './unwraps/medium.js'
// import { unwrapMimecast } from './unwraps/mimecast.js'
// import { unwrapMozillaOutgoing } from './unwraps/mozillaOutgoing.js'
// import { unwrapNicoMs } from './unwraps/nicoMs.js'
// import { unwrapOutlookSafelinks } from './unwraps/outlookSafelinks.js'
// import { unwrapPartnerAds } from './unwraps/partnerAds.js'
// import { unwrapPocket } from './unwraps/pocket.js'
// import { unwrapPostmark } from './unwraps/postmark.js'
// import { unwrapProofpointV1 } from './unwraps/proofpointV1.js'
// import { unwrapProofpointV2 } from './unwraps/proofpointV2.js'
// import { unwrapProofpointV3 } from './unwraps/proofpointV3.js'
// import { unwrapPxf } from './unwraps/pxf.js'
// import { unwrapRecruitics } from './unwraps/recruitics.js'
import { unwrapRedditOut } from './unwraps/redditOut.js'
// import { unwrapRedirectingat } from './unwraps/redirectingat.js'
// import { unwrapSegmentfault } from './unwraps/segmentfault.js'
// import { unwrapShareasale } from './unwraps/shareasale.js'
// import { unwrapSjv } from './unwraps/sjv.js'
// import { unwrapSkimlinks } from './unwraps/skimlinks.js'
// import { unwrapSlack } from './unwraps/slack.js'
// import { unwrapSmartredirect } from './unwraps/smartredirect.js'
// import { unwrapSspai } from './unwraps/sspai.js'
// import { unwrapSteamLinkfilter } from './unwraps/steamLinkfilter.js'
// import { unwrapTradedoubler } from './unwraps/tradedoubler.js'
// import { unwrapTumblr } from './unwraps/tumblr.js'
// import { unwrapValuecommerce } from './unwraps/valuecommerce.js'
// import { unwrapViglink } from './unwraps/viglink.js'
import { unwrapVkAway } from './unwraps/vkAway.js'
import { unwrapYahooSearch } from './unwraps/yahooSearch.js'
import { unwrapYouTube } from './unwraps/youtube.js'
// import { unwrapZhihu } from './unwraps/zhihu.js'

export const defaultStringTransforms: Array<StringTransform> = [
  unwrapCdataComments,
  paragraphizePlainText,
]

export const defaultDomTransforms: Array<DomTransform> = [
  decodeDoubleEncodedTags,
  stripComments,
  unwrapDoublyNestedLists,
  stripDuplicateTitleHeading,
  fixLazyImages,
  resolveRelativeUrls,
  unwrapRedirectUrls,
  stripDeadAnchors,
  stripTrackingParams,
  removeTrackingPixels,
  convertBreaksToParagraphs,
  stripInterBlockBreaks,
  stripParagraphBoundaryBreaks,
  mergeFragmentedLists,
  highlightCode,
  mergeConsecutiveOneLinerPres,
  replacePreLineBreaks,
  trimPreWhitespace,
  linkifyUrls,
  replaceEmbedsWithPlaceholders,
  injectEnclosures,
  proxyAssetUrls,
  unwrapWrappers,
  stripEmptyTags,
]

export const defaultFinalStringTransforms: Array<StringTransform> = []

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
  'nitro-lazy-src', // NitroPack — 222 hits, <0.01% of feeds. Non-`data-*` prefix.
  'data-orig', // Generic original-source variant — 27 hits, <0.01% of feeds.
  'data-runner-src', // Amazon affiliate / generic — 42 hits, <0.01% of feeds.
]

export const defaultLazySrcsetAttributes = [
  'data-srcset', // lazysizes / vanilla-lazyload / lozad / bLazy / generic — 119k hits.
  'data-tf-srcset', // Avada / Fusion ThemeBuilder — 17k hits.
  'data-lazy-srcset', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load — 5k hits.
  'data-image-srcset', // Generic / Squarespace-style — 2.5k hits, often empty.
  'data-modal-srcset', // Modal / lightbox component — 1.3k hits.
  'data-splide-lazy-srcset', // Splide.js carousel — 922 hits.
  'data-alt-srcset', // Generic alternate variant — 816 hits.
  'fifu-data-srcset', // "Featured Image From URL" WP plugin — 682 hits, often empty.
  'data-thumb-srcset', // WordPress thumbnail variant — 616 hits, often empty.
  'data-vp-popup-img-srcset', // Visual Portfolio popup — 395 hits.
  'data-original-srcset', // Legacy lazy-loaders — 220 hits, often empty.
  'data-pswp-srcset', // PhotoSwipe lightbox — 196 hits.
  'data-nectar-img-srcset', // Salient theme (Nectar) — 176 hits.
  'nitro-lazy-srcset', // NitroPack — 109 hits, <0.01% of feeds. Non-`data-*` prefix.
  'data-flickity-lazyload-srcset', // Flickity carousel — 63 hits, <0.01% of feeds.
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
  'hubspot.com', // HubSpot __ptq.gif open-pixels.
]

export const defaultTrackingPathSegments = ['pixel', 'beacon', 'count', 'impression']

export const defaultUrlUnwrappers: Array<UrlUnwrapper> = [
  // Search engines.
  unwrapBing,
  // unwrapDuckduckgo,
  unwrapGoogle,
  unwrapGoogleNews,
  unwrapGoogleNewsModern,
  unwrapGoogleScholar,
  unwrapGoogleAmpViewer,
  unwrapYahooSearch,
  unwrapYouTube,

  // Email and security gateways.
  // unwrapOutlookSafelinks,
  // unwrapProofpointV1,
  // unwrapProofpointV2,
  // unwrapProofpointV3,
  // unwrapMimecast,
  // unwrapPostmark,
  // unwrapAceml,
  // unwrapIcptrack,
  // unwrapMailchimp,
  // unwrapMailtrack,
  // unwrapMailpanion,
  // unwrapMailpgn,
  // unwrapLeverAnalytics,
  // unwrapSlack,

  // Affiliate networks.
  // unwrapShareasale,
  // unwrapAwin,
  // unwrapLinksynergy,
  // unwrapSkimlinks,
  // unwrapRedirectingat,
  // unwrapTradedoubler,
  // unwrapCjNetwork,
  // unwrapValuecommerce,
  // unwrapViglink,
  // unwrapPxf,
  // unwrapSjv,
  // unwrapEbayRover,
  // unwrapAmazonAffiliate,
  // unwrapAdjust,
  // unwrapGateSc,
  // unwrapSmartredirect,
  // unwrapEffiliation,
  // unwrapPartnerAds,
  // unwrapIdealoPartner,
  // unwrapDigidip,
  // unwrapRecruitics,
  // unwrapGeoriot,
  // unwrapFirebaseDynamicLinks,

  // Social and community platforms.
  unwrapFacebookShim,
  unwrapInstagramShim,
  // unwrapPocket,
  // unwrapTumblr,
  unwrapVkAway,
  unwrapRedditOut,
  // unwrapDisqus,
  // unwrapSteamLinkfilter,
  // unwrapDouban,
  // unwrapNicoMs,
  // unwrapMedium,
  // unwrapFlipboard,

  // Developer and publishing platforms.
  // unwrapZhihu,
  // unwrapJuejin,
  // unwrapSspai,
  // unwrapJianshuGo,
  // unwrapSegmentfault,
  // unwrapGitee,
  // unwrapHashnode,

  // Cache and proxy services.
  // unwrapAmpCache,
  // unwrapEmbedly,
  // unwrapMozillaOutgoing,

  // Legacy aggregators.
  // unwrapFeedsportal,
]
