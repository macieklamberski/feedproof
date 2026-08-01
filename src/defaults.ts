import { resolveUrl } from 'feedcanon'
import { affingerCiteResolver } from './cites/affinger.js'
import { amebaCiteResolver } from './cites/ameba.js'
import { blogCardCiteResolver } from './cites/blogcard.js'
import { cocoonCiteResolver } from './cites/cocoon.js'
import {
  devtoLegacyPostCiteResolver,
  devtoLinkCiteResolver,
  devtoPostCiteResolver,
} from './cites/devto.js'
import { discourseCiteResolver } from './cites/discourse.js'
import { embedlyCiteResolver } from './cites/embedly.js'
import { ghostCiteResolver } from './cites/ghost.js'
import { hatenaCiteResolver } from './cites/hatena.js'
import { mediumCiteResolver } from './cites/medium.js'
import { microformatsCiteResolver } from './cites/microformats.js'
import { nodebbCiteResolver } from './cites/nodebb.js'
import { notecomCiteResolver } from './cites/notecom.js'
import { paragraphCiteResolver } from './cites/paragraph.js'
import { pzlinkcardCiteResolver } from './cites/pzlinkcard.js'
import { substackCrossPostCiteResolver, substackOwnPostCiteResolver } from './cites/substack.js'
import { swellCiteResolver } from './cites/swell.js'
import { tcdCiteResolver } from './cites/tcd.js'
import { tistoryCiteResolver } from './cites/tistory.js'
import { tumblrCiteResolver } from './cites/tumblr.js'
import { xenforoCiteResolver } from './cites/xenforo.js'
import { dailymotionEmbedResolver } from './embeds/dailymotion.js'
import { jwplayerEmbedResolver } from './embeds/jwplayer.js'
import { vimeoEmbedResolver } from './embeds/vimeo.js'
import { youtubeEmbedResolver } from './embeds/youtube.js'
import { hljsHighlightFn } from './highlighters/hljs.js'
import { amebaMediaResolver } from './media/ameba.js'
import { substackMediaResolver } from './media/substack.js'
import { wechatMediaResolver } from './media/wechat.js'
import { assignVideoPosters } from './transforms/dom/assignVideoPosters.js'
import { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
import { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
import { convertAmpElements } from './transforms/dom/convertAmpElements.js'
import { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
import { convertCiteCards } from './transforms/dom/convertCiteCards.js'
import { convertDatawrapperEmbeds } from './transforms/dom/convertDatawrapperEmbeds.js'
import { convertLazyImageContainers } from './transforms/dom/convertLazyImageContainers.js'
import { convertWidgets } from './transforms/dom/convertWidgets.js'
import { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
import { demoteHeadings } from './transforms/dom/demoteHeadings.js'
import { enrichCitePlaceholders } from './transforms/dom/enrichCitePlaceholders.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
import { fixLazyAudios } from './transforms/dom/fixLazyAudios.js'
import { fixLazyIframes } from './transforms/dom/fixLazyIframes.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { fixLazyVideos } from './transforms/dom/fixLazyVideos.js'
import { flattenPictureElements } from './transforms/dom/flattenPictureElements.js'
import { highlightCode } from './transforms/dom/highlightCode.js'
import { hoistBlocksFromParagraphs } from './transforms/dom/hoistBlocksFromParagraphs.js'
import { hoistFigcaptionFromAnchor } from './transforms/dom/hoistFigcaptionFromAnchor.js'
import { injectEnclosures } from './transforms/dom/injectEnclosures.js'
import { linkifyGistEmbeds } from './transforms/dom/linkifyGistEmbeds.js'
import { linkifyUrls } from './transforms/dom/linkifyUrls.js'
import { markTimestamps } from './transforms/dom/markTimestamps.js'
import { mergeConsecutiveOneLinerPres } from './transforms/dom/mergeConsecutiveOneLinerPres.js'
import { mergeFragmentedLists } from './transforms/dom/mergeFragmentedLists.js'
import { neutralizeUnsafeUrls } from './transforms/dom/neutralizeUnsafeUrls.js'
import { normalizeAnchoredHeadings } from './transforms/dom/normalizeAnchoredHeadings.js'
import { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
import { rebuildDeferredIframes } from './transforms/dom/rebuildDeferredIframes.js'
import { rebuildElementorVideoEmbeds } from './transforms/dom/rebuildElementorVideoEmbeds.js'
import { rebuildEmbedlyEmbeds } from './transforms/dom/rebuildEmbedlyEmbeds.js'
import { rebuildEmbedPlusEmbeds } from './transforms/dom/rebuildEmbedPlusEmbeds.js'
import { rebuildLazyLoadForVideos } from './transforms/dom/rebuildLazyLoadForVideos.js'
import { rebuildLazyYtEmbeds } from './transforms/dom/rebuildLazyYtEmbeds.js'
import { rebuildLiteVideoEmbeds } from './transforms/dom/rebuildLiteVideoEmbeds.js'
import { rebuildLyteEmbeds } from './transforms/dom/rebuildLyteEmbeds.js'
import { rebuildRocketYoutubePreviews } from './transforms/dom/rebuildRocketYoutubePreviews.js'
import { rebuildWistiaEmbeds } from './transforms/dom/rebuildWistiaEmbeds.js'
import { removeTrackingPixels } from './transforms/dom/removeTrackingPixels.js'
import { replacePreLineBreaks } from './transforms/dom/replacePreLineBreaks.js'
import { resolveMediaDimensions } from './transforms/dom/resolveMediaDimensions.js'
import { resolveRelativeUrls } from './transforms/dom/resolveRelativeUrls.js'
import { shortenSamePageLinkFragments } from './transforms/dom/shortenSamePageLinkFragments.js'
import { stripBoundaryBreaks } from './transforms/dom/stripBoundaryBreaks.js'
import { stripComments } from './transforms/dom/stripComments.js'
import { stripDeadAnchors } from './transforms/dom/stripDeadAnchors.js'
import { stripDuplicateEnclosures } from './transforms/dom/stripDuplicateEnclosures.js'
import { stripDuplicateRules } from './transforms/dom/stripDuplicateRules.js'
import { stripDuplicateTitleHeading } from './transforms/dom/stripDuplicateTitleHeading.js'
import { stripEmptyTags } from './transforms/dom/stripEmptyTags.js'
import { stripHiddenElements } from './transforms/dom/stripHiddenElements.js'
import { stripInterBlockBreaks } from './transforms/dom/stripInterBlockBreaks.js'
import { stripLeadingIndentation } from './transforms/dom/stripLeadingIndentation.js'
import { stripMarkdownEscapeBackslashes } from './transforms/dom/stripMarkdownEscapeBackslashes.js'
import { stripNonContentElements } from './transforms/dom/stripNonContentElements.js'
import { stripWordBreaks } from './transforms/dom/stripWordBreaks.js'
import { surfaceNoscriptEmbeds } from './transforms/dom/surfaceNoscriptEmbeds.js'
import { surfaceTemplateEmbeds } from './transforms/dom/surfaceTemplateEmbeds.js'
import { trimPreWhitespace } from './transforms/dom/trimPreWhitespace.js'
import { unwrapDoublyNestedLists } from './transforms/dom/unwrapDoublyNestedLists.js'
import { unwrapEmojiImages } from './transforms/dom/unwrapEmojiImages.js'
import { unwrapHeadingBold } from './transforms/dom/unwrapHeadingBold.js'
import { unwrapNestedCodeWrappers } from './transforms/dom/unwrapNestedCodeWrappers.js'
import { unwrapWrappers } from './transforms/dom/unwrapWrappers.js'
import { wrapBareInlineInParagraphs } from './transforms/dom/wrapBareInlineInParagraphs.js'
import { wrapCargoGalleryImages } from './transforms/dom/wrapCargoGalleryImages.js'
import { wrapTablesForScroll } from './transforms/dom/wrapTablesForScroll.js'
import { paragraphizePlainText } from './transforms/string/paragraphizePlainText.js'
import { stripControlChars } from './transforms/string/stripControlChars.js'
import { stripOversizedBase64Sources } from './transforms/string/stripOversizedBase64Sources.js'
import { unwrapCdataComments } from './transforms/string/unwrapCdataComments.js'
import { unwrapCdataMarkers } from './transforms/string/unwrapCdataMarkers.js'
import type {
  CiteResolver,
  DeferredIframeSource,
  DomTransform,
  EmbedResolver,
  ResolveUrlFn,
  StringTransform,
  WidgetResolver,
} from './types.js'

export const defaultStringTransforms: Array<StringTransform> = [
  stripControlChars,
  stripOversizedBase64Sources,
  unwrapCdataComments,
  unwrapCdataMarkers,
  paragraphizePlainText,
]

export const defaultStandardDomTransforms: Array<DomTransform> = [
  decodeDoubleEncodedTags,
  stripComments,
  stripHiddenElements,
  // Normalize lazy-loaded video embeds into a plain <iframe> before the media/embed
  // transforms run, so each is placeholdered and any poster connected.
  surfaceTemplateEmbeds,
  surfaceNoscriptEmbeds,
  rebuildEmbedPlusEmbeds,
  rebuildLiteVideoEmbeds,
  rebuildLyteEmbeds,
  rebuildRocketYoutubePreviews,
  rebuildWistiaEmbeds,
  rebuildLazyLoadForVideos,
  rebuildLazyYtEmbeds,
  rebuildElementorVideoEmbeds,
  // Unwraps an Embedly media widget to the inner provider iframe (carrying Embedly's poster as
  // data-thumbnail), so the provider transforms below handle it instead of a cdn.embedly wrapper.
  rebuildEmbedlyEmbeds,
  // A GitHub Gist embed is a JS-only <script> that renders nothing in a reader; replace it
  // with a link to the gist so the content is at least reachable.
  linkifyGistEmbeds,
  // Wraps Cargo (cargo.site) portfolio images in <figure> here in the normalize
  // cluster, so wrapBareInlineInParagraphs later sees block boundaries and keeps the
  // caption, images, and PREV/NEXT nav apart instead of gluing them into one paragraph.
  wrapCargoGalleryImages,
  // Converts AMP custom elements into plain HTML media so the image/embed transforms
  // below can dimension, placeholder, and proxy them. Runs in this normalize cluster so
  // an amp-youtube becomes an iframe before convertWidgets, and an
  // amp-img an <img> before resolveMediaDimensions.
  convertAmpElements,
  // Materializes an iframe parked in a <div> attribute (Pym.js, @newswire/frames) so it's
  // placeholdered downstream. Runs before convertDatawrapperEmbeds so a data-frame-src
  // Datawrapper div becomes an iframe that convertDatawrapperEmbeds turns into a static image.
  rebuildDeferredIframes,
  // Converts Datawrapper chart embeds (iframe, script/noscript, and link forms) into a
  // linked static <img> of the chart's published PNG render. Runs in this normalize
  // cluster so the emitted <img> is dimensioned and proxied by the image transforms below.
  convertDatawrapperEmbeds,
  unwrapDoublyNestedLists,
  stripDuplicateTitleHeading,
  demoteHeadings,
  // Runs before flattenPictureElements and unwrapWrappers so an alignment signal on
  // a soon-dissolved <picture> or wrapper <div> is relocated onto the surviving media.
  canonicalizeAlignment,
  // Recovers a real <img> from a lazy-image container (a media-less <div>/<figure>
  // carrying an image-shaped lazy src) before the image transforms run, so the
  // resulting <img> is dimensioned and proxied like any other.
  convertLazyImageContainers,
  // fixLazyImages resolves the real src before resolveMediaDimensions reads a size from
  // the URL; resolveMediaDimensions runs before flattenPictureElements dissolves the
  // <picture> it reads dimensions from. flattenPictureElements last also lets its modern
  // <source> win over a lazy data-src.
  fixLazyImages,
  // Recover the real src/poster on a lazy <video>/<audio> element itself (lazy <source>
  // children are handled by fixLazyImages). Runs before the URL passes are applied so
  // the promoted src/poster is dimensioned, neutralized, and proxied like any other.
  fixLazyVideos,
  fixLazyAudios,
  resolveMediaDimensions,
  flattenPictureElements,
  hoistFigcaptionFromAnchor,
  stripNonContentElements,
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
  convertCiteCards,
  removeTrackingPixels,
  unwrapEmojiImages,
  // Empties lone-backslash paragraphs (`<p>\</p>`); runs before stripEmptyTags so
  // the now-empty paragraphs are removed by it.
  stripMarkdownEscapeBackslashes,
  convertBreaksToParagraphs,
  // Runs before highlightCode and the merge passes so they see real newlines. Prism
  // and Eleventy feeds separate code lines with <br> instead of \n; without this they
  // highlight as a single line and adjacent blocks get wrongly merged.
  replacePreLineBreaks,
  // Runs before highlightCode so it sees a single code block: a redundant <code> nested in
  // a <code> (or <pre> in <pre>) from the source would otherwise survive and compound the
  // reader's relative code font-size, shrinking the text.
  unwrapNestedCodeWrappers,
  // Runs before wrapBareInlineInParagraphs so a standalone multi-line <code> is promoted
  // to a <pre> before bare inline runs are swept into paragraphs.
  highlightCode,
  wrapBareInlineInParagraphs,
  stripLeadingIndentation,
  // Runs after unwrapEmojiImages so a custom emoji already carries data-emoji: without it
  // the emoji reads as a block-displayed image and the <br> after it is taken as redundant.
  stripInterBlockBreaks,
  stripBoundaryBreaks,
  mergeFragmentedLists,
  mergeConsecutiveOneLinerPres,
  trimPreWhitespace,
  // Runs before linkifyUrls so a bare URL fragmented by a <wbr> (email clients split long
  // links this way) is rejoined and linkified whole, not truncated into a dead stub.
  stripWordBreaks,
  linkifyUrls,
  markTimestamps,
  // Promotes lazy/consent-gated iframe srcs into `src` so convertWidgets
  // sees a resolvable iframe. Mirrors fixLazyImages for <img>.
  fixLazyIframes,
  convertWidgets,
  injectEnclosures,
  // Fills embed placeholder metadata via the caller's enrichEmbedFn. No-ops when that
  // option is unset. Runs after placeholders exist and before neutralize/proxy so any
  // enriched URLs are still neutralized and proxied.
  enrichEmbedPlaceholders,
  // Fills cite placeholder metadata via the caller's enrichCiteFn, for the fields a card's
  // markup leaves out (e.g. a Tumblr link block whose poster carries no URL). No-ops when
  // that option is unset. Runs after convertCiteCards has written the placeholders with
  // their urls resolved and cleaned, and before neutralize/proxy so any enriched URLs are
  // still neutralized and proxied.
  enrichCitePlaceholders,
  // Neutralizes unsafe URLs (dangerous-scheme floor + optional isSafeUrlFn) after embeds
  // and cites are placeholdered, so it covers their data-* URLs, and before
  // proxyAssetUrls so the proxy never sees an unsafe URL.
  neutralizeUnsafeUrls,
  proxyAssetUrls,
  stripEmptyTags,
  // Judges whether a bold spans the whole heading, so it runs after everything that
  // removes heading junk — stripNonContentElements (share buttons), normalizeAnchoredHeadings
  // (permalink wrappers), stripEmptyTags — or the decision is made against siblings that
  // are about to disappear and the unwrap only fires on a re-run.
  unwrapHeadingBold,
  unwrapWrappers,
  // Compares rules against their siblings, so it runs last: stripNonContentElements and
  // stripEmptyTags have to have removed whatever sat between them, and unwrapWrappers has
  // to have dissolved the per-rule <div> a feed wraps each one in — until then the rules
  // are not siblings at all and the run is invisible.
  stripDuplicateRules,
  wrapTablesForScroll,
  // Runs after everything that can insert a block element, so no transform downstream
  // leaves one inside a paragraph.
  hoistBlocksFromParagraphs,
]

// Opt-in "best judgement" transforms that may drop content on a heuristic. Not in
// the standard pipeline; enable them with the `heuristics` option (which selects
// defaultAllDomTransforms) or by composing them into a custom `domTransforms`.
export const heuristicDomTransforms: Array<DomTransform> = [
  assignVideoPosters,
  stripDuplicateEnclosures,
]

// The standard pipeline with the heuristic transforms spliced in right after
// injectEnclosures — they must run after injection (stripDuplicateEnclosures reads
// the markers it leaves) and before proxyAssetUrls rewrites media URLs.
export const defaultAllDomTransforms: Array<DomTransform> = defaultStandardDomTransforms.flatMap(
  (transform) => {
    return transform === injectEnclosures ? [transform, ...heuristicDomTransforms] : [transform]
  },
)

// Order matters when selectors overlap: each resolver runs in array order and
// claimed iframes can't be re-matched. Place more specific selectors (e.g.
// meta-providers like Embedly that wrap other providers) before broader ones.
export const defaultEmbedResolvers: Array<WidgetResolver> = [
  youtubeEmbedResolver,
  vimeoEmbedResolver,
  dailymotionEmbedResolver,
  jwplayerEmbedResolver,
  substackMediaResolver,
  amebaMediaResolver,
  wechatMediaResolver,
]

// Order matters here too: a resolver replaces the element it matches, so a later one never
// sees it. No two selectors below overlap today, so nothing depends on the current order; keep
// the more specific one first if that ever changes.
export const defaultCiteResolvers: Array<CiteResolver> = [
  ghostCiteResolver,
  substackOwnPostCiteResolver,
  substackCrossPostCiteResolver,
  cocoonCiteResolver,
  blogCardCiteResolver,
  discourseCiteResolver,
  swellCiteResolver,
  xenforoCiteResolver,
  microformatsCiteResolver,
  amebaCiteResolver,
  tistoryCiteResolver,
  tcdCiteResolver,
  hatenaCiteResolver,
  devtoLinkCiteResolver,
  nodebbCiteResolver,
  pzlinkcardCiteResolver,
  notecomCiteResolver,
  tumblrCiteResolver,
  embedlyCiteResolver,
  paragraphCiteResolver,
  devtoPostCiteResolver,
  devtoLegacyPostCiteResolver,
  affingerCiteResolver,
  mediumCiteResolver,
]

// Attributes that park a media file URL on a container which then builds the player with JS,
// so the media never appears for a reader. Counts are feeds in a 1/32 corpus sample
// (397,652 files) unless noted; the shapes were verified in live markup 2026-08-01.
export const defaultMediaSrcAttributes = [
  'data-src', // Drupal audiofield (`.audiofield-wordpress-player`) and assorted themes — 40 feeds.
  'data-video-src', // Discourse video placeholders, Discourse 3.2+ — 1 feed, but every forum on that version emits it.
  'data-mp4', // Beaver Builder row background video (`.fl-bg-video`).
  'data-webm', // The same widget's second source.
  'data-audiopath', // Sonaar MP3 Audio Player, ~100k WordPress installs — 2 feeds.
  'data-qtmplayer-file', // QTM Player — 1 feed.
  'data-asset-url', // Squarespace audio block, Squarespace-hosted — 12 feeds.
  'data-nectar-video-src', // Salient theme.
  'data-videolazy-id', // Tilda, page markup only.
  'data-mp4video', // Tilda Zero Block, page markup only.
  'data-pswp-video-src', // PhotoSwipe video support — 1 feed.
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
  'data-original-mos', // CMS lazy-image variant — ~1.4k hits, <0.01% of feeds.
]

// Attributes that hold a lazy/consent-gated iframe src (the real embed URL) when the
// `src` itself is empty or `about:blank`. Counts from a 1/16 corpus iframe-tag sample.
export const defaultLazyIframeAttributes = [
  'data-lazy-src', // Generic lazy loaders.
  'data-src', // Generic lazy loaders.
  'data-url', // Generic lazy loaders — 20 feeds carry it on empty-src iframes.
  'data-litespeed-src', // LiteSpeed Cache.
  'data-mce-src', // TinyMCE editor output.
  'data-orig', // Lazy-video facades (iframe id="_ytid_*") parking the embed URL with empty src — 337 feeds.
  'data-original-src', // Generic lazy loaders.
  'data-opt-src', // Image/embed optimizers.
  // Avada's privacy-embed facade (data-privacy-type is a taxonomy — YouTube, Vimeo, …), NOT a
  // cookie banner: it defers a real video the author embedded. Recovering it yields a privacy-safe
  // click-to-load placeholder; stripping would just delete the video. The visible Avada notice
  // (.fusion-privacy-placeholder) is stripped separately in defaultNonContentSelectors.
  'data-privacy-src', // Avada privacy-embed facade — 19 feeds.
  // Cookie-CONSENT gates (Cookiebot, Complianz, Borlabs, …) are NOT recovered — they're
  // stripped as non-content (see the GDPR block in defaultNonContentSelectors). Only generic
  // performance lazy-loaders and the privacy-video facade above live here.
]

export const defaultDeferredIframeSources: Array<DeferredIframeSource> = [
  // Pym.js (NPR) — the established responsive-embed convention; skip already-initialized nodes.
  { selector: '[data-pym-src]:not([data-pym-auto-initialized])', attribute: 'data-pym-src' },
  // @newswire/frames (Ryan Murphy; Texas Tribune bundles it as newswireFrames).
  { selector: '[data-frame-src]', attribute: 'data-frame-src' },
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

// Counts are distinct feeds from a full walk of all 12,724,862 corpus feeds (2026-07-28,
// plans/analysis/scans/emoji-full/report.md). The earlier figures here were measured on a
// ~2.7M-feed corpus and are not comparable, so every entry was re-measured together.
export const defaultEmojiImageHosts = [
  's.w.org/images/core/emoji/', // WordPress core wp-emoji-release output — 76,256 feeds (0.599%).
  's0.wp.com/wp-content/mu-plugins/wpcom-smileys/', // WordPress.com Twemoji assets — 9,863 feeds (0.078%).
  'fbcdn.net/images/emoji.php/', // Facebook embedded posts — 8,446 feeds (0.066%).
  'cdn.jsdelivr.net/gh/twitter/twemoji', // Twemoji via jsDelivr, used by IPS and others — 2,350 feeds (0.018%).
  'cdn.jsdelivr.net/joypixels/assets/', // JoyPixels CDN, incl. XenForo emoji mode — 1,895 feeds (0.015%).
  'twemoji.maxcdn.com/', // Twemoji's retired CDN, still linked from older posts — 816 feeds (0.006%).
  'abs.twimg.com/emoji/', // Twitter / X embedded tweets — 149 feeds.
  'githubassets.com/images/icons/emoji/', // GitHub README scrapings — 39 feeds.
  'assets.github.com/images/icons/emoji/', // GitHub's pre-2018 asset host; seen in archived feeds, not separately counted.
]

// Hosts that only ever serve author avatars. WordPress / WP.com attaches the
// author's gravatar as a per-item media:content image, so an otherwise imageless
// post would inject the author's face as its lead image. Matched by host and
// subdomain, so the sharded 0/1/2.gravatar.com and secure.gravatar.com are covered.
export const defaultAvatarImageHosts = [
  'gravatar.com', // WordPress / WP.com per-item author gravatar as media:content, ~30,000 feeds (~0.6%, 1% corpus sample).
]

// CSS class tokens that mark a <pre> as author-chosen distinct content
// (poetry stanzas, scriptural verses, leader-dotted tables of contents).
// `mergeConsecutiveOneLinerPres` skips any run where at least one <pre>
// carries one of these tokens. Of all
// matching runs, `wp-block-verse` and `wp-block-preformatted` dominate
// the false-positive cases (split poems, ToCs), while `wp-block-code`
// stays out — fragmented code blocks are the merge's intended target.
export const defaultPreservedPreClasses = [
  'wp-block-verse', // WordPress Gutenberg Verse block — poems, lyrics, scripture stanzas.
  'wp-block-preformatted', // WordPress Gutenberg Preformatted block — author-chosen distinct blocks (ToCs, quotes, numbered headings).
]

export const defaultNonContentSelectors = [
  // Subscribe and newsletter signup forms.
  '[data-component-name="SubscribeWidget"]', // Substack inline subscribe widget — 11,366 feeds (0.42%).
  '.subscription-widget-wrap-editor', // Substack paywall / subscribe CTA — 11,275 feeds (0.42%).
  '.embedded-publication-wrap', // Substack cross-publication subscribe promo — 527 feeds. Renders a subscribe form; treated as non-content like the rest of the subscribe-widget family.
  '.wp-block-jetpack-subscriptions', // Jetpack Gutenberg subscribe block — 353 feeds (0.013%).
  '.kg-signup-card', // Ghost (Koenig) signup card — 323 feeds (0.012%).
  '.mc4wp-form', // Mailchimp for WordPress plugin form — 311 feeds (0.012%).
  '.formkit-form', // ConvertKit / Kit subscribe form — 241 feeds (0.009%).
  'iframe[src*="embeds.beehiiv.com"]', // Beehiiv embed iframe — 81 feeds (0.003%).
  '.jetpack_subscription_widget', // Jetpack legacy sidebar subscribe widget — 69 feeds (0.003%).
  'form[action*="buttondown.email"]', // Buttondown embed-subscribe form — 21 feeds (<0.001%).
  '.sqs-block-newsletter', // Squarespace newsletter block — 11 feeds (<0.001%).
  '.et_bloom', // Bloom (Elegant Themes) optin — 963 feeds.
  '.wpforms-container', // WPForms — 804 feeds.
  '[class*="tve-leads"]', // Thrive Leads optin — 232 feeds.

  // Ad slots.
  '.adsbygoogle', // Google AdSense ad slot — 1,515 feeds (0.056%).
  'div[id^="div-gpt-ad"]', // Google Ad Manager (GPT) ad slot — 1,748 feeds.
  '.adthrive-ad', // AdThrive (Raptive) ad slot — 72 feeds (0.003%).

  // Share and call-to-action button clusters.
  '.captioned-button-wrap', // Substack caption + CTA button (Share/Subscribe/Comment) — 1,969 feeds (0.04%).
  '[class*="social-share"]', // Generic social-share button cluster — part of 1,212 feeds (0.045%).
  '[class*="share-buttons"]', // Generic social-share button cluster.
  '.sharethis-inline-share-buttons', // ShareThis inline share buttons — 643 feeds (0.024%).
  '.sharedaddy', // Jetpack Sharedaddy share buttons — 428 feeds (0.016%).
  '.feedflare', // FeedBurner share footer ("Share on X / Email this") — 220 feeds (0.008%).
  '.addtoany_share_save_container', // AddToAny share buttons (WordPress) — 97 feeds (0.004%).
  '.a2a_kit', // AddToAny share icons (higher-prevalence marker than the wrapper) — 6,714 feeds.
  '[class*="addthis_"]', // AddThis share toolbox — 2,312 feeds.
  '.shareaholic-canvas', // Shareaholic share/related widget — 669 feeds.

  // Related-posts widgets.
  '.yarpp-related', // YARPP related-posts widget (WordPress) — 672 feeds (0.025%).
  '.jp-relatedposts', // Jetpack related-posts carousel — 74 feeds (0.003%).
  '.crp_related', // Contextual Related Posts WordPress plugin — 61 feeds (0.002%).

  // Author bio blocks.
  '.wp-block-post-author', // WordPress Gutenberg author bio block — 353 feeds (0.013%).
  '.saboxplugin-wrap', // Simple Author Box WordPress plugin — 120 feeds (0.004%).

  // Excerpt-truncation links. Anchor-scoped so wrappers holding real content survive.
  'a[class*="read-more"]', // "Read more" excerpt-truncation links.
  'a[class*="continue-reading"]', // "Continue reading" excerpt-truncation links.

  // Comment-system embeds (JS mounts that render nothing without their loader script).
  '.fb-comments', // Facebook Comments — 1,050 feeds.

  // Print / PDF buttons.
  '.printfriendly', // PrintFriendly print/PDF button — ≤642 feeds (upper bound; ~half are class-scoped).
  '.pf-button', // PrintFriendly button — 93 feeds.

  // Platform UI chrome and non-rendered scaffolding.
  '.image-link-expand', // Substack restack/zoom buttons next to images — 16,419 feeds (0.6%).
  'drupal-render-placeholder', // Drupal lazy-render markers for comments/forms/flag widgets — 3,201 feeds (0.1%).
  '.mcnPreviewText', // Mailchimp hidden email preheader text — 137 feeds (0.005%).
  '.tmblr-alt-text-helper', // Tumblr badge rendering a stray "ALT" beside an image that keeps its own alt attribute. 311 feeds (0.002%).
  'img[src*="steamcommunity.com"][src*="placeholder"]', // Steam news static poster gif shown before its JS swaps in the YouTube iframe.

  // GDPR/consent- and privacy-gated embeds — the plugin parks the real iframe URL and shows a
  // cookie notice; a reader has no consent flow, so strip the gated element rather than
  // resurrect it. Matched by the attribute each plugin parks the real URL in. Kept even at low
  // prevalence — a genuine consent gate is cheap config and these CMPs are widely installed.
  '[src-consent]', // Borlabs Cookie — 2 feeds.
  '[consent-original-src]', // Consent wrappers (generic form).
  '[consent-original-src-_]', // Real Cookie Banner (rendered) — 186 feeds (both consent-original-src forms).
  '[consent-click-original-src-_]', // Real Cookie Banner (click-to-load) — 82 feeds.
  '[data-ep-src]', // Embed Privacy — 14 feeds.
  '[data-cookieblock-src]', // Cookiebot — 34 feeds.
  '[data-src-cmplz]', // Complianz — 13 feeds.
  '[data-wpconsent-src]', // WPConsent — 0 feeds.
  // Avada's leftover "For privacy reasons … please accept" notice. The gated iframe itself is
  // recovered via data-privacy-src (a lazy attribute); only this consent nag is dead chrome.
  '.fusion-privacy-placeholder', // Avada privacy-embed notice — 19 feeds.
  // Further CMPs. iframe-scoped: several of these attributes/classes also tag gated <script>
  // tags or use broader markers, so a bare attribute selector would over-match.
  'iframe[data-suppressedsrc]', // iubenda — 0 feeds.
  'iframe[data-uc-src]', // Usercentrics — 0 feeds.
  'iframe[data-consent-src]', // Cookie Information — 4 feeds.
  'iframe[data-gdpr-iframesrc]', // Moove GDPR Cookie Compliance (300k+ installs) — 1 feed.
  'iframe[data-cookiefirst-category]', // CookieFirst (real URL in data-src) — 0 feeds.
  'iframe[data-cookiescript]', // Cookie Script (real URL in data-src) — 4 feeds.
  'iframe[class*="optanon-category"]', // OneTrust / Optanon (real URL in data-src) — 71 feeds.
]
