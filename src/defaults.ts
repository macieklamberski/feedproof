import { resolveUrl } from 'feedcanon'
import { ghostBookmarkResolver } from './bookmarks/ghost.js'
import { substackBookmarkResolver } from './bookmarks/substack.js'
import { youtubeEmbedResolver } from './embeds/youtube.js'
import { hljsHighlightFn } from './highlighters/hljs.js'
import { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
import { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
import { convertBookmarkCards } from './transforms/dom/convertBookmarkCards.js'
import { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
import { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
import { demoteHeadings } from './transforms/dom/demoteHeadings.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
import { fixLazyIframes } from './transforms/dom/fixLazyIframes.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { flattenPictureElements } from './transforms/dom/flattenPictureElements.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { hoistFigcaptionFromAnchor } from './transforms/dom/hoistFigcaptionFromAnchor.js'
import { injectEnclosures } from './transforms/dom/injectEnclosures.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { markTimestamps } from './transforms/dom/markTimestamps.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
import { neutralizeUnsafeUrls } from './transforms/dom/neutralizeUnsafeUrls.js'
import { normalizeAnchoredHeadings } from './transforms/dom/normalizeAnchoredHeadings.js'
import { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replaceEmbedsWithPlaceholders } from './transforms/dom/replaceEmbedsWithPlaceholders.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveMediaDimensions } from './transforms/dom/resolveMediaDimensions.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { shortenSamePageLinkFragments } from './transforms/dom/shortenSamePageLinkFragments.js'
import { stripBoundaryBreaks } from './transforms/dom/stripBoundaryBreaks.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
import { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
import { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
import { stripHiddenElements } from './transforms/dom/stripHiddenElements.js'
import { stripInertElements } from './transforms/dom/stripInertElements.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
import { unwrapEmojiImages } from './transforms/dom/unwrapEmojiImages.js'
import { unwrapHeadingBold } from './transforms/dom/unwrapHeadingBold.js'
import { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
import { wrapBareInlineInParagraphs } from './transforms/dom/wrapBareInlineInParagraphs.js'
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
} from './types.js'

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
  stripHiddenElements,
  unwrapDoublyNestedLists,
  stripDuplicateTitleHeading,
  demoteHeadings,
  unwrapHeadingBold,
  // Runs before flattenPictureElements and unwrapWrappers so an alignment signal on
  // a soon-dissolved <picture> or wrapper <div> is relocated onto the surviving media.
  canonicalizeAlignment,
  // fixLazyImages resolves the real src before resolveMediaDimensions reads a size from
  // the URL; resolveMediaDimensions runs before flattenPictureElements dissolves the
  // <picture> it reads dimensions from. flattenPictureElements last also lets its modern
  // <source> win over a lazy data-src.
  fixLazyImages,
  resolveMediaDimensions,
  flattenPictureElements,
  hoistFigcaptionFromAnchor,
  stripInertElements,
  resolveRelativeUrls,
  cleanAnchorUrls,
  // Runs after resolveRelativeUrls/cleanAnchorUrls so hrefs are absolute and cleaned,
  // and before normalizeAnchoredHeadings so heading permalinks are already bare
  // `#fragment` when the canonical `<a name>` is built.
  shortenSamePageLinkFragments,
  // Runs after cleanAnchorUrls so the href it inspects is already cleaned/resolved,
  // and before stripDeadAnchors so a `#`-only permalink isn't unwrapped first.
  normalizeAnchoredHeadings,
  stripDeadAnchors,
  convertBookmarkCards,
  removeTrackingPixels,
  unwrapEmojiImages,
  convertBreaksToParagraphs,
  // Runs before highlightCode and the merge passes so they see real newlines. Prism
  // and Eleventy feeds separate code lines with <br> instead of \n; without this they
  // highlight as a single line and adjacent blocks get wrongly merged.
  replacePreLineBreaks,
  // Runs before wrapBareInlineInParagraphs so a promoted standalone code block is a
  // <pre> (block) by the time bare inline runs are wrapped, avoiding a <pre> nested
  // inside a <p>.
  highlightCode,
  wrapBareInlineInParagraphs,
  stripLeadingIndentation,
  stripInterBlockBreaks,
  stripBoundaryBreaks,
  mergeFragmentedLists,
  mergeConsecutiveOneLinerPres,
  trimPreWhitespace,
  linkifyUrls,
  markTimestamps,
  // Promotes lazy/consent-gated iframe srcs into `src` so replaceEmbedsWithPlaceholders
  // sees a resolvable iframe. Mirrors fixLazyImages for <img>.
  fixLazyIframes,
  replaceEmbedsWithPlaceholders,
  injectEnclosures,
  // Fills embed placeholder metadata via the caller's enrichEmbedFn. No-ops when that
  // option is unset. Runs after placeholders exist and before neutralize/proxy so any
  // enriched URLs are still neutralized and proxied.
  enrichEmbedPlaceholders,
  // Neutralizes unsafe URLs (dangerous-scheme floor + optional isSafeUrlFn) after embeds
  // and bookmarks are placeholdered, so it covers their data-* URLs, and before
  // proxyAssetUrls so the proxy never sees an unsafe URL.
  neutralizeUnsafeUrls,
  proxyAssetUrls,
  stripEmptyTags,
  unwrapWrappers,
  wrapTablesForScroll,
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

// Default code highlighter: highlight.js. Swap it via the highlightFn option.
export const defaultHighlightFn = hljsHighlightFn

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
  'fifu-data-src', // "Featured Image From URL" WP plugin — 2.1k hits, <0.01% of feeds.
  'data-cfsrc', // Cloudflare Mirage edge rewrite — 641 hits, <0.01% of feeds.
  'data-echo', // echo.js lazy-loader — 901 hits, <0.01% of feeds.
  'data-opt-src', // Optimole image CDN — 390 hits, <0.01% of feeds.
  'data-normal', // Future plc / generic CDN lazy-loader — 294 hits, <0.01% of feeds.
]

// Attributes that hold a lazy/consent-gated iframe src (the real embed URL) when the
// `src` itself is empty or `about:blank`. Counts from a 1/16 corpus iframe-tag sample.
export const defaultLazyIframeAttributes = [
  'data-lazy-src', // Generic lazy loaders.
  'data-src', // Generic lazy loaders.
  'data-url', // Generic lazy loaders — 20 feeds carry it on empty-src iframes.
  'data-litespeed-src', // LiteSpeed Cache.
  'data-mce-src', // TinyMCE editor output.
  'data-original-src', // Generic lazy loaders.
  'data-opt-src', // Image/embed optimizers.
  'src-consent', // GDPR/cookie-consent wrappers (e.g. Borlabs) holding the real src.
  'consent-original-src', // Consent wrappers.
  'consent-original-src-_', // Real Cookie Banner rendered form (trailing `-_`) — 167 feeds.
  'consent-click-original-src-_', // Real Cookie Banner click-to-load variant — 142 feeds.
  'data-privacy-src', // Privacy/lazy-video plugins (data-privacy-type="youtube") — 69 feeds.
  'data-ep-src', // Embed Privacy — 54 feeds.
  'data-cookieblock-src', // Cookiebot consent gate — 26 feeds.
  'data-src-cmplz', // Complianz consent gate — 20 feeds.
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
  // Anchor-scoped so a "read-more"/"continue-reading" *wrapper* (which can hold real
  // content) is never deleted — only the truncation link itself. The class appears on
  // 11,475 feeds (0.42%); the anchor subset is smaller but the safe one to strip.
  'a[class*="read-more"]', // "Read more" excerpt-truncation links.
  'a[class*="continue-reading"]', // "Continue reading" excerpt-truncation links.
  '[class*="social-share"]', // Generic social-share button cluster — part of 1,212 feeds (0.045%).
  '[class*="share-buttons"]', // Generic social-share button cluster.
  '.feedflare', // FeedBurner share footer ("Share on X / Email this") — 220 feeds (0.008%).
]
