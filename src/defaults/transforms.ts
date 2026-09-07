import { resolveUrl } from 'feedcanon'
import { hljsHighlightFn } from '../highlighters/hljs.js'
import { assignVideoPosters } from '../transforms/dom/assignVideoPosters.js'
import { canonicalizeAlignment } from '../transforms/dom/canonicalizeAlignment.js'
import { cleanAnchorUrls } from '../transforms/dom/cleanAnchorUrls.js'
import { convertAmpNativeElements } from '../transforms/dom/convertAmpNativeElements.js'
import { convertBreaksToParagraphs } from '../transforms/dom/convertBreaksToParagraphs.js'
import { convertCiteCards } from '../transforms/dom/convertCiteCards.js'
import { convertDatawrapperEmbeds } from '../transforms/dom/convertDatawrapperEmbeds.js'
import { convertGiphyEmbeds } from '../transforms/dom/convertGiphyEmbeds.js'
import { convertLazyImageContainers } from '../transforms/dom/convertLazyImageContainers.js'
import { convertNoteEmbeds } from '../transforms/dom/convertNoteEmbeds.js'
import { convertSmartframeEmbeds } from '../transforms/dom/convertSmartframeEmbeds.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import { decodeDoubleEncodedTags } from '../transforms/dom/decodeDoubleEncodedTags.js'
import { demoteHeadings } from '../transforms/dom/demoteHeadings.js'
import { enrichCitePlaceholders } from '../transforms/dom/enrichCitePlaceholders.js'
import { enrichEmbedPlaceholders } from '../transforms/dom/enrichEmbedPlaceholders.js'
import { fixLazyAudios } from '../transforms/dom/fixLazyAudios.js'
import { fixLazyIframes } from '../transforms/dom/fixLazyIframes.js'
import { fixLazyImages } from '../transforms/dom/fixLazyImages.js'
import { fixLazyVideos } from '../transforms/dom/fixLazyVideos.js'
import { fixSubstackImageLinks } from '../transforms/dom/fixSubstackImageLinks.js'
import { fixSubstackMentions } from '../transforms/dom/fixSubstackMentions.js'
import { flattenPictureElements } from '../transforms/dom/flattenPictureElements.js'
import { highlightCode } from '../transforms/dom/highlightCode.js'
import { hoistBlocksFromParagraphs } from '../transforms/dom/hoistBlocksFromParagraphs.js'
import { hoistFigcaptionFromAnchor } from '../transforms/dom/hoistFigcaptionFromAnchor.js'
import { injectEnclosures } from '../transforms/dom/injectEnclosures.js'
import { linkifyGistEmbeds } from '../transforms/dom/linkifyGistEmbeds.js'
import { linkifyUrls } from '../transforms/dom/linkifyUrls.js'
import { markTimestamps } from '../transforms/dom/markTimestamps.js'
import { mergeConsecutiveOneLinerPres } from '../transforms/dom/mergeConsecutiveOneLinerPres.js'
import { mergeFragmentedLists } from '../transforms/dom/mergeFragmentedLists.js'
import { mergeWrappedCaptionText } from '../transforms/dom/mergeWrappedCaptionText.js'
import { neutralizeUnsafeUrls } from '../transforms/dom/neutralizeUnsafeUrls.js'
import { normalizeAnchoredHeadings } from '../transforms/dom/normalizeAnchoredHeadings.js'
import { proxyAssetUrls } from '../transforms/dom/proxyAssetUrls.js'
import { rebuildDeferredIframes } from '../transforms/dom/rebuildDeferredIframes.js'
import { rebuildElementorVideoEmbeds } from '../transforms/dom/rebuildElementorVideoEmbeds.js'
import { rebuildEmbedlyEmbeds } from '../transforms/dom/rebuildEmbedlyEmbeds.js'
import { rebuildEmbedPlusEmbeds } from '../transforms/dom/rebuildEmbedPlusEmbeds.js'
import { rebuildGettyImagesEmbeds } from '../transforms/dom/rebuildGettyImagesEmbeds.js'
import { rebuildLazyLoadForVideos } from '../transforms/dom/rebuildLazyLoadForVideos.js'
import { rebuildLazyYtEmbeds } from '../transforms/dom/rebuildLazyYtEmbeds.js'
import { rebuildLiteVideoEmbeds } from '../transforms/dom/rebuildLiteVideoEmbeds.js'
import { rebuildLyteEmbeds } from '../transforms/dom/rebuildLyteEmbeds.js'
import { rebuildRocketYoutubePreviews } from '../transforms/dom/rebuildRocketYoutubePreviews.js'
import { rebuildVideoJsEmbeds } from '../transforms/dom/rebuildVideoJsEmbeds.js'
import { rebuildWistiaEmbeds } from '../transforms/dom/rebuildWistiaEmbeds.js'
import { removeTrackingPixels } from '../transforms/dom/removeTrackingPixels.js'
import { replacePreLineBreaks } from '../transforms/dom/replacePreLineBreaks.js'
import { resolveMediaDimensions } from '../transforms/dom/resolveMediaDimensions.js'
import { resolveRelativeUrls } from '../transforms/dom/resolveRelativeUrls.js'
import { shortenSamePageLinkFragments } from '../transforms/dom/shortenSamePageLinkFragments.js'
import { stripBoundaryBreaks } from '../transforms/dom/stripBoundaryBreaks.js'
import { stripComments } from '../transforms/dom/stripComments.js'
import { stripDeadAnchors } from '../transforms/dom/stripDeadAnchors.js'
import { stripDuplicateEnclosures } from '../transforms/dom/stripDuplicateEnclosures.js'
import { stripDuplicateLeadingImages } from '../transforms/dom/stripDuplicateLeadingImages.js'
import { stripDuplicateRules } from '../transforms/dom/stripDuplicateRules.js'
import { stripDuplicateTitleHeading } from '../transforms/dom/stripDuplicateTitleHeading.js'
import { stripEmptyTags } from '../transforms/dom/stripEmptyTags.js'
import { stripHiddenElements } from '../transforms/dom/stripHiddenElements.js'
import { stripInterBlockBreaks } from '../transforms/dom/stripInterBlockBreaks.js'
import { stripLeadingIndentation } from '../transforms/dom/stripLeadingIndentation.js'
import { stripMarkdownEscapeBackslashes } from '../transforms/dom/stripMarkdownEscapeBackslashes.js'
import { stripNonContentElements } from '../transforms/dom/stripNonContentElements.js'
import { stripWordBreaks } from '../transforms/dom/stripWordBreaks.js'
import { surfaceNoscriptEmbeds } from '../transforms/dom/surfaceNoscriptEmbeds.js'
import { surfaceParkedMarkup } from '../transforms/dom/surfaceParkedMarkup.js'
import { surfaceTemplateEmbeds } from '../transforms/dom/surfaceTemplateEmbeds.js'
import { trimPreWhitespace } from '../transforms/dom/trimPreWhitespace.js'
import { unwrapDoublyNestedLists } from '../transforms/dom/unwrapDoublyNestedLists.js'
import { unwrapEmojiImages } from '../transforms/dom/unwrapEmojiImages.js'
import { unwrapHeadingBold } from '../transforms/dom/unwrapHeadingBold.js'
import { unwrapNestedCodeWrappers } from '../transforms/dom/unwrapNestedCodeWrappers.js'
import { unwrapWrappers } from '../transforms/dom/unwrapWrappers.js'
import { wrapBareInlineInParagraphs } from '../transforms/dom/wrapBareInlineInParagraphs.js'
import { wrapCargoGalleryImages } from '../transforms/dom/wrapCargoGalleryImages.js'
import { wrapOrphanFigcaptions } from '../transforms/dom/wrapOrphanFigcaptions.js'
import { wrapTablesForScroll } from '../transforms/dom/wrapTablesForScroll.js'
import { paragraphizePlainText } from '../transforms/string/paragraphizePlainText.js'
import { stripControlChars } from '../transforms/string/stripControlChars.js'
import { stripOversizedBase64Sources } from '../transforms/string/stripOversizedBase64Sources.js'
import { unwrapCdataComments } from '../transforms/string/unwrapCdataComments.js'
import { unwrapCdataMarkers } from '../transforms/string/unwrapCdataMarkers.js'
import type { DomTransform, ResolveUrlFn, StringTransform } from '../types.js'

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
  // Unwraps both Embedly carriers to the inner provider iframe (carrying Embedly's poster as
  // data-thumbnail), so the provider transforms below handle them instead of an Embedly shell:
  // the rendered cdn.embedly wrapper, and the empty div whose oEmbed payload rides in `data`.
  // Runs before convertCiteCards so a payload naming `link` still reaches the cite pass, and
  // before stripEmptyTags, which is what deletes an empty carrier nothing has claimed.
  rebuildEmbedlyEmbeds,
  rebuildGettyImagesEmbeds,
  // A GitHub Gist embed is a JS-only <script> that renders nothing in a reader. Replace it
  // with a link to the gist so the content is at least reachable.
  linkifyGistEmbeds,
  // A Substack @-mention is an empty span whose name lives only in its data-attrs JSON;
  // rebuild the anchor before stripEmptyTags deletes the span and the name with it.
  fixSubstackMentions,
  // A Substack lightbox anchor can arrive with its <img> child stripped. Remint the image
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
  convertSmartframeEmbeds,
  unwrapDoublyNestedLists,
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
  // Runs after the lazy passes so a beacon is judged on its real src, and before
  // resolveMediaDimensions, which drops any width/height that is not a positive integer. A
  // declared `0` is what marks the dominant beacon shape, so reading it has to happen first.
  removeTrackingPixels,
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
  // Compares the first heading's text with the article title, so it runs after
  // normalizeAnchoredHeadings has dropped the permalink glyph (`#`, `¶`) a generator puts
  // inside the heading, or the glyph is read as part of the text and the title never matches,
  // and after convertCiteCards has folded link cards into placeholders: a card quotes the
  // linked page's title in a heading of its own, and a post about that page carries the same
  // title, so read before the cite pass the card's heading was taken for the article's.
  stripDuplicateTitleHeading,
  // Runs after stripDuplicateTitleHeading: a removed title <h1> must not demote the body's
  // own headings.
  demoteHeadings,
  unwrapEmojiImages,
  // Empties lone-backslash paragraphs (`<p>\</p>`); runs before stripEmptyTags so
  // the now-empty paragraphs are removed by it.
  stripMarkdownEscapeBackslashes,
  convertBreaksToParagraphs,
  // Runs before highlightCode and the merge passes so they see real newlines. Prism
  // and Eleventy feeds separate code lines with <br> instead of \n. Without this they
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
  // Promotes lazy/consent-gated iframe srcs into `src` so convertWidgets sees a resolvable iframe.
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
  // removes heading junk: stripNonContentElements (share buttons), normalizeAnchoredHeadings
  // (permalink wrappers), stripEmptyTags, or the decision is made against siblings that
  // are about to disappear and the unwrap only fires on a re-run.
  unwrapHeadingBold,
  // Runs before unwrapWrappers: the wrapper grouping a caption's text blocks with the
  // figcaption is the evidence they belong together, and unwrapWrappers dissolves it.
  mergeWrappedCaptionText,
  unwrapWrappers,
  // Runs after unwrapWrappers: a shared caption's figures sit in a wrapper of their own until
  // it dissolves, so until then they are not the caption's siblings and the group is invisible.
  wrapOrphanFigcaptions,
  // Compares rules against their siblings, so it runs last: stripNonContentElements and
  // stripEmptyTags have to have removed whatever sat between them, and unwrapWrappers has
  // to have dissolved the per-rule <div> a feed wraps each one in: until then the rules
  // are not siblings at all and the run is invisible.
  stripDuplicateRules,
  wrapTablesForScroll,
  // Runs after everything that can insert a block element, so no transform downstream
  // leaves one inside a paragraph.
  hoistBlocksFromParagraphs,
]

// Opt-in "best judgement" transforms that may drop content on a heuristic. Not in
// the standard pipeline. Enable them with the `heuristics` option (which selects
// defaultAllDomTransforms) or by composing them into a custom `domTransforms`.
export const heuristicDomTransforms: Array<DomTransform> = [
  assignVideoPosters,
  stripDuplicateEnclosures,
  // After stripDuplicateEnclosures: an injected enclosure that duplicates the first
  // content image is already gone by then, so this only sees publisher-authored repeats.
  stripDuplicateLeadingImages,
]

// The standard pipeline with the heuristic transforms spliced in right after
// injectEnclosures: they must run after injection (stripDuplicateEnclosures reads
// the markers it leaves) and before proxyAssetUrls rewrites media URLs.
export const defaultAllDomTransforms: Array<DomTransform> = defaultStandardDomTransforms.flatMap(
  (transform) => {
    return transform === injectEnclosures ? [transform, ...heuristicDomTransforms] : [transform]
  },
)

export const defaultResolveUrlFn: ResolveUrlFn = (url, baseUrl) => resolveUrl(url, baseUrl)

// Default code highlighter: highlight.js. Swap it via the highlightFn option.
export const defaultHighlightFn = hljsHighlightFn
