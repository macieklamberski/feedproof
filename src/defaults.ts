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
import { acastEmbedResolver } from './embeds/acast.js'
import { anchorEmbedResolver } from './embeds/anchor.js'
import { appleEmbedResolver } from './embeds/apple.js'
import { archiveFlashEmbedResolver, archiveIframeEmbedResolver } from './embeds/archive.js'
import { audioboomEmbedResolver } from './embeds/audioboom.js'
import { bandcampEmbedResolver } from './embeds/bandcamp.js'
import { bloggerEmbedResolver } from './embeds/blogger.js'
import { blubrryEmbedResolver } from './embeds/blubrry.js'
import {
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
} from './embeds/brightcove.js'
import {
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
} from './embeds/buzzsprout.js'
import { captivateEmbedResolver } from './embeds/captivate.js'
import { dailymotionEmbedResolver } from './embeds/dailymotion.js'
import { firesideEmbedResolver } from './embeds/fireside.js'
import { flickrEmbedResolver } from './embeds/flickr.js'
import { flourishEmbedResolver } from './embeds/flourish.js'
import { geniallyEmbedResolver } from './embeds/genially.js'
import { imgurBlockquoteEmbedResolver, imgurIframeEmbedResolver } from './embeds/imgur.js'
import { issuuIframeEmbedResolver, issuuWidgetEmbedResolver } from './embeds/issuu.js'
import { ivooxEmbedResolver } from './embeds/ivoox.js'
import {
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
} from './embeds/jwplayer.js'
import { libsynEmbedResolver } from './embeds/libsyn.js'
import { mediavineEmbedResolver } from './embeds/mediavine.js'
import { megaphoneEmbedResolver } from './embeds/megaphone.js'
import { mixcloudEmbedResolver } from './embeds/mixcloud.js'
import { nicovideoIframeEmbedResolver, nicovideoScriptEmbedResolver } from './embeds/nicovideo.js'
import { omnyEmbedResolver } from './embeds/omny.js'
import { podbeanEmbedResolver } from './embeds/podbean.js'
import { podigeeEmbedResolver } from './embeds/podigee.js'
import { redditIframeEmbedResolver, redditWidgetEmbedResolver } from './embeds/reddit.js'
import { scribdFlashEmbedResolver, scribdIframeEmbedResolver } from './embeds/scribd.js'
import { simplecastEmbedResolver } from './embeds/simplecast.js'
import { slideshareFlashEmbedResolver, slideshareIframeEmbedResolver } from './embeds/slideshare.js'
import { soundcloudEmbedResolver } from './embeds/soundcloud.js'
import {
  speakerdeckIframeEmbedResolver,
  speakerdeckScriptEmbedResolver,
} from './embeds/speakerdeck.js'
import { spotifyEmbedResolver } from './embeds/spotify.js'
import { spreakerAnchorEmbedResolver, spreakerIframeEmbedResolver } from './embeds/spreaker.js'
import { tedEmbedResolver } from './embeds/ted.js'
import { telegramIframeEmbedResolver, telegramScriptEmbedResolver } from './embeds/telegram.js'
import { transistorEmbedResolver } from './embeds/transistor.js'
import { typeformIframeEmbedResolver, typeformWidgetEmbedResolver } from './embeds/typeform.js'
import { vimeoEmbedResolver } from './embeds/vimeo.js'
import { wistiaEmbedResolver } from './embeds/wistia.js'
import { youtubeAmpEmbedResolver, youtubeIframeEmbedResolver } from './embeds/youtube.js'
import { coblocksGalleryResolver } from './galleries/coblocks.js'
import { ghostGalleryResolver } from './galleries/ghost.js'
import { jetpackSlideshowResolver } from './galleries/jetpack.js'
import { wordpressGalleryResolver } from './galleries/wordpress.js'
import { hljsHighlightFn } from './highlighters/hljs.js'
import { discourseMediaResolver } from './media/discourse.js'
import { ghostMediaResolver } from './media/ghost.js'
import { podloveMediaResolver } from './media/podlove.js'
import { substackMediaResolver } from './media/substack.js'
import { wechatMediaResolver } from './media/wechat.js'
import { weeblyMediaResolver } from './media/weebly.js'
import { assignVideoPosters } from './transforms/dom/assignVideoPosters.js'
import { canonicalizeAlignment } from './transforms/dom/canonicalizeAlignment.js'
import { cleanAnchorUrls } from './transforms/dom/cleanAnchorUrls.js'
import { convertAmpNativeElements } from './transforms/dom/convertAmpNativeElements.js'
import { convertBreaksToParagraphs } from './transforms/dom/convertBreaksToParagraphs.js'
import { convertCiteCards } from './transforms/dom/convertCiteCards.js'
import { convertDatawrapperEmbeds } from './transforms/dom/convertDatawrapperEmbeds.js'
import { convertGalleries } from './transforms/dom/convertGalleries.js'
import { convertGiphyEmbeds } from './transforms/dom/convertGiphyEmbeds.js'
import { convertLazyImageContainers } from './transforms/dom/convertLazyImageContainers.js'
import { convertNoteEmbeds } from './transforms/dom/convertNoteEmbeds.js'
import { convertWidgets } from './transforms/dom/convertWidgets.js'
import { decodeDoubleEncodedTags } from './transforms/dom/decodeDoubleEncodedTags.js'
import { demoteHeadings } from './transforms/dom/demoteHeadings.js'
import { enrichCitePlaceholders } from './transforms/dom/enrichCitePlaceholders.js'
import { enrichEmbedPlaceholders } from './transforms/dom/enrichEmbedPlaceholders.js'
import { fixLazyAudios } from './transforms/dom/fixLazyAudios.js'
import { fixLazyIframes } from './transforms/dom/fixLazyIframes.js'
import { fixLazyImages } from './transforms/dom/fixLazyImages.js'
import { fixLazyVideos } from './transforms/dom/fixLazyVideos.js'
import { fixSubstackImageLinks } from './transforms/dom/fixSubstackImageLinks.js'
import { fixSubstackMentions } from './transforms/dom/fixSubstackMentions.js'
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
import { rebuildVideoJsEmbeds } from './transforms/dom/rebuildVideoJsEmbeds.js'
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
import { stripDuplicateLeadingImages } from './transforms/dom/stripDuplicateLeadingImages.js'
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
import { surfaceParkedMarkup } from './transforms/dom/surfaceParkedMarkup.js'
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
  GalleryResolver,
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
  // Dissolves a lazy-loader container into the original embed markup it holds encoded. Runs at
  // the head of the cluster because what comes out is ordinary markup of any kind, so every pass
  // below (comment and hidden-element stripping, the rebuilds, convertWidgets, the cite pass)
  // has to see it.
  surfaceParkedMarkup,
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
  rebuildVideoJsEmbeds,
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
  // A Substack @-mention is an empty span whose name lives only in its data-attrs JSON;
  // rebuild the anchor before stripEmptyTags deletes the span and the name with it.
  fixSubstackMentions,
  // A Substack lightbox anchor can arrive with its <img> child stripped; remint the image
  // from the anchor's own href before stripEmptyTags deletes the empty anchor, so the
  // image passes below dimension and proxy it like any other.
  fixSubstackImageLinks,
  // Wraps Cargo (cargo.site) portfolio images in <figure> here in the normalize
  // cluster, so wrapBareInlineInParagraphs later sees block boundaries and keeps the
  // caption, images, and PREV/NEXT nav apart instead of gluing them into one paragraph.
  wrapCargoGalleryImages,
  // Converts AMP custom elements into their native HTML equivalents so the image/embed
  // transforms below can dimension, placeholder, and proxy them. Runs in this normalize
  // cluster so an amp-iframe becomes an <iframe> before convertWidgets, and an amp-img an
  // <img> before resolveMediaDimensions. AMP elements that name a platform are not converted
  // here: their own resolvers claim them in the widget pass.
  convertAmpNativeElements,
  // Converts note.com's empty embed figures: media services become plain iframes for the
  // widget pass to classify, own-post embeds become plain links (the figure carries only
  // the post URL). External-article figures stay for the cite pass.
  convertNoteEmbeds,
  // Materializes an iframe parked in a <div> attribute (Pym.js, @newswire/frames) so it's
  // placeholdered downstream. Runs before convertDatawrapperEmbeds so a data-frame-src
  // Datawrapper div becomes an iframe that convertDatawrapperEmbeds turns into a static image.
  rebuildDeferredIframes,
  // Converts Datawrapper chart embeds (iframe, script/noscript, and link forms) into a
  // linked static <img> of the chart's published PNG render. Runs in this normalize
  // cluster so the emitted <img> is dimensioned and proxied by the image transforms below.
  convertDatawrapperEmbeds,
  convertGiphyEmbeds,
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
  // Sits after resolveRelativeUrls and the lazy-image fixes: whatever goes into the
  // data-gallery-items JSON has to be already real and absolute, because that JSON is out
  // of reach of the per-attribute URL passes. neutralizeUnsafeUrls and proxyAssetUrls run
  // later and are the two passes that do reach into it (rewriteGalleryItemUrls).
  convertGalleries,
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
  // After stripDuplicateEnclosures: an injected enclosure that duplicates the first
  // content image is already gone by then, so this only sees publisher-authored repeats.
  stripDuplicateLeadingImages,
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
export const defaultWidgetResolvers: Array<WidgetResolver> = [
  youtubeIframeEmbedResolver,
  youtubeAmpEmbedResolver,
  tedEmbedResolver,
  typeformWidgetEmbedResolver,
  typeformIframeEmbedResolver,
  transistorEmbedResolver,
  vimeoEmbedResolver,
  wistiaEmbedResolver,
  captivateEmbedResolver,
  dailymotionEmbedResolver,
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  issuuWidgetEmbedResolver,
  issuuIframeEmbedResolver,
  ivooxEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
  jwplayerAmpEmbedResolver,
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
  libsynEmbedResolver,
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
  blubrryEmbedResolver,
  mediavineEmbedResolver,
  mixcloudEmbedResolver,
  podbeanEmbedResolver,
  megaphoneEmbedResolver,
  podigeeEmbedResolver,
  redditWidgetEmbedResolver,
  redditIframeEmbedResolver,
  simplecastEmbedResolver,
  scribdFlashEmbedResolver,
  scribdIframeEmbedResolver,
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
  soundcloudEmbedResolver,
  speakerdeckScriptEmbedResolver,
  speakerdeckIframeEmbedResolver,
  firesideEmbedResolver,
  flickrEmbedResolver,
  flourishEmbedResolver,
  geniallyEmbedResolver,
  acastEmbedResolver,
  anchorEmbedResolver,
  appleEmbedResolver,
  archiveIframeEmbedResolver,
  archiveFlashEmbedResolver,
  bandcampEmbedResolver,
  bloggerEmbedResolver,
  audioboomEmbedResolver,
  omnyEmbedResolver,
  nicovideoScriptEmbedResolver,
  nicovideoIframeEmbedResolver,
  spotifyEmbedResolver,
  spreakerIframeEmbedResolver,
  spreakerAnchorEmbedResolver,
  telegramScriptEmbedResolver,
  telegramIframeEmbedResolver,
  substackMediaResolver,
  weeblyMediaResolver,
  wechatMediaResolver,
  ghostMediaResolver,
  discourseMediaResolver,
  podloveMediaResolver,
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

// Order matters here too: a resolver replaces the element it matches, so a later one never
// sees it. No two selectors below overlap (`wp-block-coblocks-gallery-*` is a different
// class token from `wp-block-gallery`); keep the more specific one first if that ever
// changes.
export const defaultGalleryResolvers: Array<GalleryResolver> = [
  wordpressGalleryResolver,
  ghostGalleryResolver,
  jetpackSlideshowResolver,
  coblocksGalleryResolver,
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
// `src` itself is empty or `about:blank`. Counts from 1/16 and 1/64 corpus iframe-tag samples.
export const defaultLazyIframeAttributes = [
  'data-lazy-src', // Generic lazy loaders.
  'data-src', // Generic lazy loaders.
  'data-url', // Generic lazy loaders — 20 feeds carry it on empty-src iframes.
  'data-litespeed-src', // LiteSpeed Cache.
  'data-mce-src', // TinyMCE editor output.
  'data-orig', // Lazy-video facades (iframe id="_ytid_*") parking the embed URL with empty src — 337 feeds.
  'data-original-src', // Generic lazy loaders.
  'data-opt-src', // Image/embed optimizers.
  // Invision Community forums defer embeds two ways: an iframe with no src at all, or one whose
  // src points at the forum's own blank interface page; fixLazyIframes treats that page as a
  // placeholder so this attribute wins in both shapes.
  'data-embed-src', // Invision Community deferred embeds — 24 feeds in a 1/64 sample.
  // Avada's privacy-embed facade (data-privacy-type is a taxonomy — YouTube, Vimeo, …), NOT a
  // cookie banner: it defers a real video the author embedded. Recovering it yields a privacy-safe
  // click-to-load placeholder; stripping would just delete the video. The visible Avada notice
  // (.fusion-privacy-placeholder) is stripped separately in defaultNonContentSelectors.
  'data-privacy-src', // Avada privacy-embed facade — 19 feeds.
  // Cookie-consent gates (CMPs) sit on the same recover side of that line. Each plugin rewrites
  // the author's embed iframe in place, dropping src and parking the real URL in its own
  // attribute, and feed bodies carry no consent flow: the gated iframe is the whole embed, and
  // every parked URL classified in the corpus is a player or viewer (YouTube, Bandcamp, Vimeo,
  // SoundCloud, Spotify, PeerTube, Google docs/maps). The tracking iframes CMPs gate live in
  // page chrome, which never reaches feed content. Real Cookie Banner parks the same URL plus
  // autoplay=1 in consent-click-original-src-_ on the same iframe, so the non-autoplay
  // attribute is listed first and wins. OneTrust, CookieFirst and Cookie Script park theirs in
  // data-src, already listed above. Gated <script> tags and the notice elements a few plugins
  // serialize next to the iframe stay stripped in defaultNonContentSelectors.
  'consent-original-src', // Consent wrappers (generic form) — 0 feeds, kept beside the suffixed form.
  'consent-original-src-_', // Real Cookie Banner — 186 feeds.
  'consent-click-original-src-_', // Real Cookie Banner click-to-load variant — fallback only.
  'src-consent', // Borlabs Cookie — 2 feeds.
  'data-cookieblock-src', // Cookiebot — 34 feeds; the attribute is the only URL copy.
  'data-src-cmplz', // Complianz — 13 feeds; src holds the plugin's placeholder video or about:blank.
  'data-consent-src', // Cookie Information / Publii Embed Consent — 4 feeds.
  'data-wpconsent-src', // WPConsent — 0 feeds.
  'data-suppressedsrc', // iubenda — 0 feeds.
  'data-uc-src', // Usercentrics — 0 feeds.
  'data-gdpr-iframesrc', // Moove GDPR Cookie Compliance — 1 feed.
  // EmbedPlus parks the deferred player's URL here; the plugin's facade shape is rebuilt by
  // rebuildEmbedPlusEmbeds.
  'data-ep-src', // EmbedPlus YouTube deferred player — 14 feeds.
  // Below the 1/64 sample resolution; the count is from an older full-corpus walk.
  'data-lazy-load', // JetElements / Woodmart / Elementor lazy video widgets — 82 feeds.
]

export const defaultDeferredIframeSources: Array<DeferredIframeSource> = [
  // Pym.js (NPR) — the established responsive-embed convention; skip already-initialized nodes.
  { selector: '[data-pym-src]:not([data-pym-auto-initialized])', attribute: 'data-pym-src' },
  // @newswire/frames (Ryan Murphy; Texas Tribune bundles it as newswireFrames).
  { selector: '[data-frame-src]', attribute: 'data-frame-src' },
  // The Drupal/CKEditor oEmbed convention parks the source url on the wrapper, so unlike the
  // two above the value is a watch page rather than a player: `youtube.com/watch` in 321 feeds,
  // `vimeo.com` in 138, `listen.style/p` in 53. That is fine here, because convertWidgets asks
  // the resolvers what the url means and they mint the player from it; a host nobody resolves
  // becomes a placeholder carrying a visible link, which is what those feeds show today anyway.
  //
  // Scoped to a wrapper holding no player. In 566 of the 624 feeds the iframe is already inside,
  // and this transform replaces the element it matches, so an unscoped entry would throw away a
  // working iframe along with the width and height it states.
  {
    selector: '[data-oembed-url]:not(:has(iframe, embed, object, video, audio))',
    attribute: 'data-oembed-url',
  },
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

// Feed counts below are distinct feeds in the 12,724,862-feed corpus, from one full walk on
// 2026-07-24. A `≤` count is an upper bound: the walk matched the marker anywhere in the feed
// while the selector here is narrower, so the true figure is lower by an unmeasured margin.
export const defaultNonContentSelectors = [
  // Subscribe and newsletter signup forms.
  '[data-component-name="SubscribeWidget"]', // Substack inline subscribe widget — 7,718 feeds (0.061%).
  '.subscription-widget-wrap-editor', // Substack paywall / subscribe CTA — 7,648 feeds (0.060%).
  '.embedded-publication-wrap', // Substack cross-publication subscribe promo — 527 feeds (0.004%). Renders a subscribe form; treated as non-content like the rest of the subscribe-widget family.
  '.wp-block-jetpack-subscriptions', // Jetpack Gutenberg subscribe block — 245 feeds (0.002%).
  '.kg-signup-card', // Ghost (Koenig) signup card — 266 feeds (0.002%).
  '.mc4wp-form', // Mailchimp for WordPress plugin form — 214 feeds (0.002%).
  '.formkit-form', // ConvertKit / Kit subscribe form — 152 feeds (0.001%).
  'iframe[src*="embeds.beehiiv.com"]', // Beehiiv embed iframe — 61 feeds (<0.001%).
  '.jetpack_subscription_widget', // Jetpack legacy sidebar subscribe widget — 51 feeds (<0.001%).
  'form[action*="buttondown.email"]', // Buttondown embed-subscribe form — 21 feeds (<0.001%); 1,055 feeds mention the host at all, nearly all as plain links.
  '.sqs-block-newsletter', // Squarespace newsletter block — 3 feeds (<0.001%).
  // Bloom (Elegant Themes) optin. The bare `.et_bloom` class does not exist on any element in
  // the corpus: the tokens are `et_bloom_bottom_trigger` (881 feeds), `et_bloom_fields` and so
  // on, and a class selector matches whole tokens, so it stripped nothing. Matched on the
  // prefix instead. Most of what that reaches is the empty trigger span, which stripEmptyTags
  // already removed; the ~40 feeds carrying the popup form are what this actually gains.
  '[class*="et_bloom"]',
  '.wpforms-container', // WPForms — 804 feeds (0.006%).
  '[class*="tve-leads"]', // Thrive Leads optin — 232 feeds (0.002%).

  // Ad slots.
  '.adsbygoogle', // Google AdSense ad slot — 11,388 feeds (0.089%).
  'div[id^="div-gpt-ad"]', // Google Ad Manager (GPT) ad slot — 1,748 feeds (0.014%).
  '.adthrive-ad', // AdThrive (Raptive) ad slot — 79 feeds (0.001%).
  'amp-ad', // AMP ad slot — 97 feeds.
  'amp-auto-ads', // AMP auto-ads placement marker — 24 feeds.
  'amp-sticky-ad', // AMP sticky bottom ad bar — 4 feeds.
  'amp-sticky-ad-top-padding', // AMP runtime spacer holding room for the sticky ad bar — 4 feeds.

  // Tracking beacons, which render nothing at all.
  'amp-pixel', // AMP tracking pixel — 15 feeds.
  'amp-analytics', // AMP analytics element, a JSON config for its runtime — 9 feeds.

  // Share and call-to-action button clusters.
  '.captioned-button-wrap', // Substack caption + CTA button (Share/Subscribe/Comment) — 1,976 feeds (0.016%).
  '[class*="social-share"]', // Generic social-share button cluster — ≤1,695 feeds (0.013%).
  '[class*="share-buttons"]', // Generic social-share button cluster — 2,153 feeds (0.017%).
  '.sharethis-inline-share-buttons', // ShareThis inline share buttons — 674 feeds (0.005%).
  '.sharedaddy', // Jetpack Sharedaddy share buttons — 588 feeds (0.005%).
  '.feedflare', // FeedBurner share footer ("Share on X / Email this") — 262 feeds (0.002%).
  '.addtoany_share_save_container', // AddToAny share buttons (WordPress) — 157 feeds (0.001%).
  // The AddToAny anchor itself. Empty in 6,904 of 8,138 feeds, where stripEmptyTags already
  // removed it; this is for the ~1,170 whose variant carries an image or text and survives as
  // a "Share" button.
  'a.addtoany_share_save',
  // Survives as a live "Tweet" link in the output — 3,002 feeds, 2,807 of them with no other
  // non-content selector matching anywhere.
  'a.twitter-share-button',
  // Drupal Easy Social — 1,652 feeds. Worth more than its count: the widget is chrome, but the
  // pipeline cannot tell, so its Facebook Like iframe becomes an embed placeholder card and the
  // chrome is promoted to content.
  'div.easy_social_box',
  '.a2a_kit', // AddToAny share icons (higher-prevalence marker than the wrapper) — 6,714 feeds (0.053%).
  '[class*="addthis_"]', // AddThis share toolbox — 2,312 feeds (0.018%).
  '.shareaholic-canvas', // Shareaholic share/related widget — 669 feeds (0.005%).
  'amp-social-share', // AMP share button — 9 feeds.

  // Related-posts widgets.
  '.yarpp-related', // YARPP related-posts widget (WordPress) — 1,243 feeds (0.010%).
  '.jp-relatedposts', // Jetpack related-posts carousel — 427 feeds (0.003%).
  '.crp_related', // Contextual Related Posts WordPress plugin — 207 feeds (0.002%).

  // Author bio blocks.
  '.wp-block-post-author', // WordPress Gutenberg author bio block — 244 feeds (0.002%).
  '.saboxplugin-wrap', // Simple Author Box WordPress plugin — 352 feeds (0.003%).

  // Excerpt-truncation links. Anchor-scoped so wrappers holding real content survive.
  'a[class*="read-more"]', // "Read more" excerpt-truncation links — ≤44,947 feeds (0.353%).
  'a[class*="continue-reading"]', // "Continue reading" excerpt-truncation links — ≤1,822 feeds (0.014%).

  // Comment-system embeds (JS mounts that render nothing without their loader script).
  '.fb-comments', // Facebook Comments — 1,050 feeds (0.008%).

  // Print / PDF buttons.
  '.printfriendly', // PrintFriendly print/PDF button — 199 feeds (0.002%).
  '.pf-button', // PrintFriendly button — 93 feeds (0.001%).

  // Platform UI chrome and non-rendered scaffolding.
  '.image-link-expand', // Substack restack/zoom buttons next to images — 11,319 feeds (0.089%).
  'drupal-render-placeholder', // Drupal lazy-render markers for comments/forms/flag widgets — 13,345 feeds (0.105%).
  '.mcnPreviewText', // Mailchimp hidden email preheader text — 276 feeds (0.002%).
  '.tmblr-alt-text-helper', // Tumblr badge rendering a stray "ALT" beside an image that keeps its own alt attribute. 311 feeds (0.002%).
  'img[src*="steamcommunity.com"][src*="placeholder"]', // Steam news static poster gif shown before its JS swaps in the YouTube iframe — ≤2,331 feeds (0.018%).

  // GDPR/consent-gated embeds are recovered, not stripped: each CMP parks the author's embed
  // URL on the iframe itself, so fixLazyIframes promotes it back into src (see the CMP block in
  // defaultLazyIframeAttributes). What stays stripped here is the part that renders as chrome.
  // Real Cookie Banner also gates <script> tags (adsbygoogle, Vimeo player.js). Script-scoped so
  // the gated scripts still go while the gated iframes are recovered.
  'script[consent-original-src-_]', // Real Cookie Banner gated scripts — 14 occurrences.
  '.cookieconsent-optout-marketing', // Cookiebot "please accept marketing cookies" notice beside the gated iframe.
  '.pec-overlay', // Publii Embed Consent click-to-accept overlay beside the gated iframe.
  // OneTrust video fallback: thumbnail plus "enable cookies to view this content" text and a
  // settings link, serialized as a sibling of the gated iframe inside the wrapper.
  '.onetrust-css-video-wrapper .fallback-container', // OneTrust video fallback notice.
  // Avada's leftover "For privacy reasons … please accept" notice. The gated iframe itself is
  // recovered via data-privacy-src (a lazy attribute); only this consent nag is dead chrome.
  '.fusion-privacy-placeholder', // Avada privacy-embed notice — 19 feeds.
  // AMP's own gate follows the same split. The element holds the config and the prompt UI and
  // nothing else, since whatever it gates carries data-block-on-consent and sits elsewhere in
  // the document, so removing it takes the nag and leaves the gated element to be recovered.
  'amp-consent', // AMP consent gate — 3 feeds.
  // s9e MediaEmbed (forum software) wraps its player in a sizing span. Where the feed generator
  // stripped the iframe out of it, what survives is the wrapper around the literal word
  // "iframe", which renders as that word in the middle of the post. 392 feeds. Scoped to a
  // wrapper holding no player, so the ones whose iframe survived are untouched. The video id is
  // nowhere in the markup, so there is nothing to recover here, only chrome to remove.
  'span[data-s9e-mediaembed]:not(:has(iframe, embed, object, video, audio))',
]
