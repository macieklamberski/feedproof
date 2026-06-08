import { resolveUrl } from 'feedcanon'
import { ghostBookmarkResolver } from './bookmarks/ghost.js'
import { substackBookmarkResolver } from './bookmarks/substack.js'
import { youtubeEmbedResolver } from './embeds/youtube.js'
import { convertBookmarkCards } from './transforms/dom/convertBookmarkCards.js'
import { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
import { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
import { demoteHeadings } from './transforms/dom/demoteHeadings.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { flattenPictureElements } from './transforms/dom/flattenPictureElements.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { hoistFigcaptionFromAnchor } from './transforms/dom/hoistFigcaptionFromAnchor.js'
import { injectEnclosures } from './transforms/dom/injectEnclosures.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { markTimestamps } from './transforms/dom/markTimestamps.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
import { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { stripBoundaryBreaks } from './transforms/dom/stripBoundaryBreaks.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
import { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
import { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
import { stripInertElements } from './transforms/dom/stripInertElements.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
import { stripTrackingParams } from './transforms/dom/stripTrackingParams.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
import { unwrapEmojiImages } from './transforms/dom/unwrapEmojiImages.js'
import { unwrapHeadingBold } from './transforms/dom/unwrapHeadingBold.js'
import { unwrapRedirectUrls } from './transforms/dom/unwrapRedirectUrls.js'
import { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
import { wrapBareInlineInParagraphs } from './transforms/dom/wrapBareInlineInParagraphs.js'
import { wrapPresForScroll } from './transforms/dom/wrapPresForScroll.js'
import { wrapTablesForScroll } from './transforms/dom/wrapTablesForScroll.js'
import { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
import { stripControlChars } from './transforms/string/stripControlChars.js'
import { stripOversizedBase64Sources } from './transforms/string/stripOversizedBase64Sources.js'
import { unwrapCdataComments } from './transforms/string/unwrapCdataComments.js'
import { unwrapCdataMarkers } from './transforms/string/unwrapCdataMarkers.js'
import type {
  BookmarkResolver,
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
  stripControlChars,
  stripOversizedBase64Sources,
  unwrapCdataComments,
  unwrapCdataMarkers,
  paragraphizePlainText,
]

export const defaultDomTransforms: Array<DomTransform> = [
  decodeDoubleEncodedTags,
  stripComments,
  unwrapDoublyNestedLists,
  stripDuplicateTitleHeading,
  demoteHeadings,
  unwrapHeadingBold,
  flattenPictureElements,
  fixLazyImages,
  hoistFigcaptionFromAnchor,
  stripInertElements,
  resolveRelativeUrls,
  unwrapRedirectUrls,
  stripDeadAnchors,
  stripTrackingParams,
  convertBookmarkCards,
  removeTrackingPixels,
  unwrapEmojiImages,
  convertBreaksToParagraphs,
  wrapBareInlineInParagraphs,
  stripLeadingIndentation,
  stripInterBlockBreaks,
  stripBoundaryBreaks,
  mergeFragmentedLists,
  highlightCode,
  mergeConsecutiveOneLinerPres,
  replacePreLineBreaks,
  trimPreWhitespace,
  linkifyUrls,
  markTimestamps,
  replaceEmbedsWithPlaceholders,
  injectEnclosures,
  proxyAssetUrls,
  stripEmptyTags,
  unwrapWrappers,
  wrapTablesForScroll,
  wrapPresForScroll,
]

// Order matters when selectors overlap: each resolver runs in array order and
// claimed iframes can't be re-matched. Place more specific selectors (e.g.
// meta-providers like Embedly that wrap other providers) before broader ones.
export const defaultEmbedResolvers: Array<EmbedResolver> = [youtubeEmbedResolver]

export const defaultBookmarkResolvers: Array<BookmarkResolver> = [
  ghostBookmarkResolver,
  substackBookmarkResolver,
]

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
  'follow.it', // follow.it RSS view pixels (api.follow.it/track-rss-*).
  'pheedo.com', // Pheedo feed-ad tracker (/feeds/tracker.php).
  'statcounter.com', // StatCounter analytics pixels (c.statcounter.com/counter.php).
  'gigya.com', // Gigya/SAP Wildfire IMP pixels (counters.gigya.com).
  'counter.theconversation.com', // The Conversation article counters (/content/<id>/count.gif).
  'rt.prnewswire.com', // PR Newswire release tracking (rt.gif).
  'assoc-amazon.com', // Amazon Associates link pixels (/e/ir?).
  'assoc-amazon.jp', // Amazon Associates link pixels (JP).
  'assoc-amazon.co.uk', // Amazon Associates link pixels (UK).
  'assoc-amazon.de', // Amazon Associates link pixels (DE).
  'assoc-amazon.fr', // Amazon Associates link pixels (FR).
  'linksynergy.com', // Rakuten Advertising (LinkSynergy) affiliate pixels.
  'pxf.io', // Impact Radius affiliate pixels.
  'valuecommerce.com', // ValueCommerce (JP) affiliate impression pixels.
  'a8.net', // A8.net (JP) affiliate pixels.
  'moshimo.com', // Moshimo Affiliate (JP) impression pixels.
  'accesstrade.net', // AccessTrade (JP) affiliate pixels.
  'rentracks.jp', // Rentracks (JP) affiliate pixels (/adx/p.gifx).
  'felmat.net', // felmat (JP) affiliate pixels (/fmimp/).
  'afi-b.com', // affiliate-B (JP) lead pixels (/lead/).
  'affiliate-b.com', // affiliate-B (JP) affiliate pixels.
  'evyy.net', // ValueCommerce/LinkShare (evyy) affiliate pixels.
  'flexlinkspro.com', // FlexOffers affiliate pixels (/i.ashx).
  'postaffiliatepro.com', // Post Affiliate Pro tracking pixels.
]

export const defaultTrackingPathSegments = ['pixel', 'beacon', 'count', 'impression']

export const defaultEmojiImageHosts = [
  's.w.org/images/core/emoji/', // WordPress core wp-emoji-release output — 56,859 feeds (2.10%).
  's0.wp.com/wp-content/mu-plugins/wpcom-smileys/', // WordPress.com (Twemoji assets) — 11,043 feeds (0.41%).
  'fbcdn.net/images/emoji.php/', // Facebook embedded posts — 3,983 feeds (0.15%).
  'abs.twimg.com/emoji/', // Twitter / X embedded tweets — 195 feeds.
  'githubassets.com/images/icons/emoji/', // GitHub README scrapings — 43 feeds.
]

// CSS class tokens that mark a <pre> as author-chosen distinct content
// (poetry stanzas, scriptural verses, leader-dotted tables of contents).
// `mergeConsecutiveOneLinerPres` skips any run where at least one <pre>
// carries one of these tokens. Curated from a corpus scan: of all
// matching runs, `wp-block-verse` and `wp-block-preformatted` dominate
// the false-positive cases (split poems, ToCs), while `wp-block-code`
// stays out — fragmented code blocks are the merge's intended target.
export const defaultPreservedPreClasses = [
  'wp-block-verse', // WordPress Gutenberg Verse block — poems, lyrics, scripture stanzas.
  'wp-block-preformatted', // WordPress Gutenberg Preformatted block — author-chosen distinct blocks (ToCs, quotes, numbered headings).
]

export const defaultInertSelectors = [
  '.image-link-expand', // Substack restack/zoom buttons next to images — 16,419 feeds (0.6%).
  '[data-component-name="SubscribeWidget"]', // Substack inline subscribe widget — 11,366 feeds (0.42%).
  '.subscription-widget-wrap-editor', // Substack paywall / subscribe CTA — 11,275 feeds (0.42%).
  'drupal-render-placeholder', // Drupal lazy-render markers for comments/forms/flag widgets — 3,201 feeds (0.1%).
  '.adsbygoogle', // Google AdSense ad slot — 1,515 feeds (0.056%).
  '.embedded-publication-wrap', // Substack cross-publication subscribe promo — 766 feeds (0.028%).
  '.yarpp-related', // YARPP related-posts widget (WordPress) — 672 feeds (0.025%).
  '.sharethis-inline-share-buttons', // ShareThis inline share buttons — 643 feeds (0.024%).
  '.sharedaddy', // Jetpack Sharedaddy share buttons — 428 feeds (0.016%).
  '.wp-block-jetpack-subscriptions', // Jetpack Gutenberg subscribe block — 353 feeds (0.013%).
  '.wp-block-post-author', // WordPress Gutenberg author bio block — 353 feeds (0.013%).
  '.kg-signup-card', // Ghost (Koenig) signup card — 323 feeds (0.012%).
  '.mc4wp-form', // Mailchimp for WordPress plugin form — 311 feeds (0.012%).
  '.formkit-form', // ConvertKit / Kit subscribe form — 241 feeds (0.009%).
  '.mcnPreviewText', // Mailchimp hidden email preheader text — 137 feeds (0.005%).
  '.saboxplugin-wrap', // Simple Author Box WordPress plugin — 120 feeds (0.004%).
  '.addtoany_share_save_container', // AddToAny share buttons (WordPress) — 97 feeds (0.004%).
  'iframe[src*="embeds.beehiiv.com"]', // Beehiiv embed iframe — 81 feeds (0.003%).
  '.jp-relatedposts', // Jetpack related-posts carousel — 74 feeds (0.003%).
  '.adthrive-ad', // AdThrive (Raptive) ad slot — 72 feeds (0.003%).
  '.jetpack_subscription_widget', // Jetpack legacy sidebar subscribe widget — 69 feeds (0.003%).
  '.crp_related', // Contextual Related Posts WordPress plugin — 61 feeds (0.002%).
  'form[action*="buttondown.email"]', // Buttondown embed-subscribe form — 21 feeds (<0.001%).
  '.sqs-block-newsletter', // Squarespace newsletter block — 11 feeds (<0.001%).
]

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
