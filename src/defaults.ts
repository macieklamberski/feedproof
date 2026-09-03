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
import {
  substackCrossPostCiteResolver,
  substackOwnPostCiteResolver,
  substackPostEmbedCiteResolver,
  substackPublicationCiteResolver,
} from './cites/substack.js'
import { swellCiteResolver } from './cites/swell.js'
import { tcdCiteResolver } from './cites/tcd.js'
import { tistoryCiteResolver } from './cites/tistory.js'
import { tumblrCiteResolver } from './cites/tumblr.js'
import { xenforoCiteResolver } from './cites/xenforo.js'
import { acastEmbedResolver } from './embeds/acast.js'
import { anchorEmbedResolver } from './embeds/anchor.js'
import { aparatIframeEmbedResolver, aparatScriptEmbedResolver } from './embeds/aparat.js'
import { appleEmbedResolver } from './embeds/apple.js'
import { archiveFlashEmbedResolver, archiveIframeEmbedResolver } from './embeds/archive.js'
import { audioboomEmbedResolver } from './embeds/audioboom.js'
import { bandcampEmbedResolver } from './embeds/bandcamp.js'
import { bitchuteEmbedResolver } from './embeds/bitchute.js'
import { bloggerEmbedResolver } from './embeds/blogger.js'
import { blubrryEmbedResolver } from './embeds/blubrry.js'
import {
  blueskyBlockquoteEmbedResolver,
  blueskyIframeEmbedResolver,
  blueskyPostElementEmbedResolver,
  blueskyS9eEmbedResolver,
} from './embeds/bluesky.js'
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
import { codepenIframeEmbedResolver, codepenWidgetEmbedResolver } from './embeds/codepen.js'
import { dailymotionEmbedResolver } from './embeds/dailymotion.js'
import {
  facebookAmpEmbedResolver,
  facebookBlockquoteEmbedResolver,
  facebookIframeEmbedResolver,
  facebookWidgetEmbedResolver,
  facebookXfbmlEmbedResolver,
} from './embeds/facebook.js'
import { firesideEmbedResolver } from './embeds/fireside.js'
import { flickrEmbedResolver } from './embeds/flickr.js'
import { flourishIframeEmbedResolver, flourishWidgetEmbedResolver } from './embeds/flourish.js'
import { geniallyEmbedResolver } from './embeds/genially.js'
import { gettyImagesEmbedResolver } from './embeds/gettyimages.js'
import { imgurBlockquoteEmbedResolver, imgurIframeEmbedResolver } from './embeds/imgur.js'
import {
  instagramAmpEmbedResolver,
  instagramBlockquoteEmbedResolver,
  instagramIframeEmbedResolver,
  instagramSubstackEmbedResolver,
} from './embeds/instagram.js'
import { issuuIframeEmbedResolver, issuuWidgetEmbedResolver } from './embeds/issuu.js'
import { ivooxEmbedResolver } from './embeds/ivoox.js'
import {
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
  jwplayerSetupEmbedResolver,
} from './embeds/jwplayer.js'
import { libsynEmbedResolver } from './embeds/libsyn.js'
import { linkedinEmbedResolver } from './embeds/linkedin.js'
import { mastodonEmbedResolver } from './embeds/mastodon.js'
import { mediavineEmbedResolver } from './embeds/mediavine.js'
import { megaphoneEmbedResolver } from './embeds/megaphone.js'
import { mixcloudEmbedResolver } from './embeds/mixcloud.js'
import { nicovideoIframeEmbedResolver, nicovideoScriptEmbedResolver } from './embeds/nicovideo.js'
import { notecomIframeEmbedResolver } from './embeds/notecom.js'
import { odyseeEmbedResolver } from './embeds/odysee.js'
import { omnyEmbedResolver } from './embeds/omny.js'
import { podbeanEmbedResolver } from './embeds/podbean.js'
import { podigeeEmbedResolver, podigeeIframeEmbedResolver } from './embeds/podigee.js'
import { redditIframeEmbedResolver, redditWidgetEmbedResolver } from './embeds/reddit.js'
import { scribdFlashEmbedResolver, scribdIframeEmbedResolver } from './embeds/scribd.js'
import { simplecastEmbedResolver } from './embeds/simplecast.js'
import { sketchfabEmbedResolver } from './embeds/sketchfab.js'
import { slideshareFlashEmbedResolver, slideshareIframeEmbedResolver } from './embeds/slideshare.js'
import { soundcloudEmbedResolver } from './embeds/soundcloud.js'
import {
  speakerdeckIframeEmbedResolver,
  speakerdeckScriptEmbedResolver,
} from './embeds/speakerdeck.js'
import { spotifyEmbedResolver } from './embeds/spotify.js'
import { spreakerAnchorEmbedResolver, spreakerIframeEmbedResolver } from './embeds/spreaker.js'
import { standfmEmbedResolver } from './embeds/standfm.js'
import { tedEmbedResolver } from './embeds/ted.js'
import { telegramIframeEmbedResolver, telegramScriptEmbedResolver } from './embeds/telegram.js'
import { tiktokBlockquoteEmbedResolver, tiktokIframeEmbedResolver } from './embeds/tiktok.js'
import { transistorEmbedResolver } from './embeds/transistor.js'
import {
  twitterAmpEmbedResolver,
  twitterBlockquoteEmbedResolver,
  twitterIframeEmbedResolver,
  twitterSubstackEmbedResolver,
} from './embeds/twitter.js'
import { typeformIframeEmbedResolver, typeformWidgetEmbedResolver } from './embeds/typeform.js'
import { videopressFlashEmbedResolver, videopressIframeEmbedResolver } from './embeds/videopress.js'
import { vimeoEmbedResolver } from './embeds/vimeo.js'
import { wistiaEmbedResolver } from './embeds/wistia.js'
import { youtubeAmpEmbedResolver, youtubeIframeEmbedResolver } from './embeds/youtube.js'
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
import { mergeWrappedCaptionText } from './transforms/dom/mergeWrappedCaptionText.js'
import { neutralizeUnsafeUrls } from './transforms/dom/neutralizeUnsafeUrls.js'
import { normalizeAnchoredHeadings } from './transforms/dom/normalizeAnchoredHeadings.js'
import { proxyAssetUrls } from './transforms/dom/proxyAssetUrls.js'
import { rebuildDeferredIframes } from './transforms/dom/rebuildDeferredIframes.js'
import { rebuildElementorVideoEmbeds } from './transforms/dom/rebuildElementorVideoEmbeds.js'
import { rebuildEmbedlyEmbeds } from './transforms/dom/rebuildEmbedlyEmbeds.js'
import { rebuildEmbedPlusEmbeds } from './transforms/dom/rebuildEmbedPlusEmbeds.js'
import { rebuildGettyImagesEmbeds } from './transforms/dom/rebuildGettyImagesEmbeds.js'
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
import { wrapOrphanFigcaptions } from './transforms/dom/wrapOrphanFigcaptions.js'
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
  MediaResolver,
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

// Order matters when selectors overlap: each resolver runs in array order and
// claimed iframes can't be re-matched. Place more specific selectors (e.g.
// meta-providers like Embedly that wrap other providers) before broader ones.
const embedResolvers: Array<EmbedResolver> = [
  youtubeIframeEmbedResolver,
  youtubeAmpEmbedResolver,
  twitterBlockquoteEmbedResolver,
  twitterAmpEmbedResolver,
  twitterSubstackEmbedResolver,
  twitterIframeEmbedResolver,
  tedEmbedResolver,
  typeformWidgetEmbedResolver,
  typeformIframeEmbedResolver,
  transistorEmbedResolver,
  vimeoEmbedResolver,
  videopressIframeEmbedResolver,
  videopressFlashEmbedResolver,
  wistiaEmbedResolver,
  captivateEmbedResolver,
  codepenWidgetEmbedResolver,
  codepenIframeEmbedResolver,
  dailymotionEmbedResolver,
  imgurBlockquoteEmbedResolver,
  imgurIframeEmbedResolver,
  issuuWidgetEmbedResolver,
  issuuIframeEmbedResolver,
  ivooxEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerScriptEmbedResolver,
  jwplayerAmpEmbedResolver,
  jwplayerSetupEmbedResolver,
  brightcoveFlashEmbedResolver,
  brightcoveIframeEmbedResolver,
  brightcoveVideoJsEmbedResolver,
  libsynEmbedResolver,
  linkedinEmbedResolver,
  buzzsproutIframeEmbedResolver,
  buzzsproutScriptEmbedResolver,
  blubrryEmbedResolver,
  facebookWidgetEmbedResolver,
  facebookIframeEmbedResolver,
  facebookBlockquoteEmbedResolver,
  facebookXfbmlEmbedResolver,
  facebookAmpEmbedResolver,
  mediavineEmbedResolver,
  mixcloudEmbedResolver,
  podbeanEmbedResolver,
  megaphoneEmbedResolver,
  podigeeEmbedResolver,
  podigeeIframeEmbedResolver,
  redditWidgetEmbedResolver,
  redditIframeEmbedResolver,
  simplecastEmbedResolver,
  scribdFlashEmbedResolver,
  scribdIframeEmbedResolver,
  slideshareFlashEmbedResolver,
  slideshareIframeEmbedResolver,
  sketchfabEmbedResolver,
  tiktokBlockquoteEmbedResolver,
  tiktokIframeEmbedResolver,
  soundcloudEmbedResolver,
  speakerdeckScriptEmbedResolver,
  speakerdeckIframeEmbedResolver,
  firesideEmbedResolver,
  flickrEmbedResolver,
  flourishWidgetEmbedResolver,
  flourishIframeEmbedResolver,
  geniallyEmbedResolver,
  gettyImagesEmbedResolver,
  acastEmbedResolver,
  anchorEmbedResolver,
  aparatIframeEmbedResolver,
  aparatScriptEmbedResolver,
  appleEmbedResolver,
  archiveIframeEmbedResolver,
  archiveFlashEmbedResolver,
  bandcampEmbedResolver,
  bitchuteEmbedResolver,
  bloggerEmbedResolver,
  blueskyBlockquoteEmbedResolver,
  blueskyIframeEmbedResolver,
  blueskyS9eEmbedResolver,
  blueskyPostElementEmbedResolver,
  audioboomEmbedResolver,
  notecomIframeEmbedResolver,
  omnyEmbedResolver,
  odyseeEmbedResolver,
  nicovideoScriptEmbedResolver,
  nicovideoIframeEmbedResolver,
  standfmEmbedResolver,
  instagramBlockquoteEmbedResolver,
  instagramAmpEmbedResolver,
  instagramSubstackEmbedResolver,
  instagramIframeEmbedResolver,
  spotifyEmbedResolver,
  spreakerIframeEmbedResolver,
  spreakerAnchorEmbedResolver,
  telegramScriptEmbedResolver,
  telegramIframeEmbedResolver,
  mastodonEmbedResolver,
]

const mediaResolvers: Array<MediaResolver> = [
  substackMediaResolver,
  weeblyMediaResolver,
  wechatMediaResolver,
  ghostMediaResolver,
  discourseMediaResolver,
  podloveMediaResolver,
]

// Order matters here too: a resolver replaces the element it matches, so a later one never
// sees it. No two selectors below overlap today, so nothing depends on the current order. Keep
// the more specific one first if that ever changes.
const citeResolvers: Array<CiteResolver> = [
  ghostCiteResolver,
  substackOwnPostCiteResolver,
  substackCrossPostCiteResolver,
  substackPostEmbedCiteResolver,
  substackPublicationCiteResolver,
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

export const defaultWidgetResolvers: Array<WidgetResolver> = [
  ...embedResolvers,
  ...mediaResolvers,
  ...citeResolvers,
]

// Attributes that park a media file URL on a container which then builds the player with JS,
// so the media never appears for a reader. The shapes were verified in live markup 2026-08-01.
export const defaultMediaSrcAttributes = [
  'data-src', // Drupal audiofield (`.audiofield-wordpress-player`) and assorted themes.
  'data-video-src', // Discourse video placeholders, Discourse 3.2+: every forum on that version emits it.
  'data-mp4', // Beaver Builder row background video (`.fl-bg-video`).
  'data-webm', // The same widget's second source.
  'data-audiopath', // Sonaar MP3 Audio Player, ~100k WordPress installs.
  'data-qtmplayer-file', // QTM Player.
  'data-asset-url', // Squarespace audio block, Squarespace-hosted.
  'data-nectar-video-src', // Salient theme.
  'data-videolazy-id', // Tilda, page markup only.
  'data-mp4video', // Tilda Zero Block, page markup only.
  'data-pswp-video-src', // PhotoSwipe video support.
]

export const defaultResolveUrlFn: ResolveUrlFn = (url, baseUrl) => resolveUrl(url, baseUrl)

// Default code highlighter: highlight.js. Swap it via the highlightFn option.
export const defaultHighlightFn = hljsHighlightFn

export const defaultLazySrcAttributes = [
  'data-src', // lazysizes / vanilla-lazyload / lozad / Drupal Blazy / a3 Lazy Load / Smush / EWWW / generic.
  'data-original', // Legacy jquery_lazyload (tuupola v1): large legacy footprint.
  'data-lazy-src', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load.
  'data-url', // Generic, observed across multiple lazy-loaders.
  'data-image', // Squarespace ImageLoader: the highest-volume real-world variant.
  'data-orig-file', // WordPress unscaled original (Jetpack media library).
  'data-large-file', // WordPress responsive variant.
  'data-medium-file', // WordPress responsive medium fallback.
  'data-thumb', // WordPress thumbnail variant.
  'data-thumb-src', // WordPress thumbnail src variant.
  'data-original-src', // Legacy lazy-loaders / pika.page CDN.
  'data-image-src', // Legacy Atlassian-style CMS.
  'data-canonical-src', // YouTube / retina-aware renderers.
  'data-img-url', // Amazon affiliate widgets / generic.
  'nitro-lazy-src', // NitroPack. Non-`data-*` prefix.
  'data-orig', // Generic original-source variant.
  'data-runner-src', // Amazon affiliate / generic.
  'fifu-data-src', // "Featured Image From URL" WP plugin.
  'data-cfsrc', // Cloudflare Mirage edge rewrite.
  'data-echo', // echo.js lazy-loader.
  'data-opt-src', // Optimole image CDN.
  'data-normal', // Future plc / generic CDN lazy-loader.
  'data-original-mos', // CMS lazy-image variant.
]

// Attributes that hold a lazy/consent-gated iframe src (the real embed URL) when the
// `src` itself is empty or `about:blank`.
export const defaultLazyIframeAttributes = [
  'data-lazy-src', // Generic lazy loaders.
  'data-src', // Generic lazy loaders.
  'data-url', // Generic lazy loaders.
  'data-litespeed-src', // LiteSpeed Cache.
  'data-mce-src', // TinyMCE editor output.
  'data-orig', // Lazy-video facades (iframe id="_ytid_*") parking the embed URL with empty src.
  'data-original-src', // Generic lazy loaders.
  'data-opt-src', // Image/embed optimizers.
  // Invision Community forums defer embeds two ways: an iframe with no src at all, or one whose
  // src points at the forum's own blank interface page. FixLazyIframes treats that page as a
  // placeholder so this attribute wins in both shapes.
  'data-embed-src', // Invision Community deferred embeds.
  // Avada's privacy-embed facade (data-privacy-type is a taxonomy: YouTube, Vimeo, …), NOT a
  // cookie banner: it defers a real video the author embedded. Recovering it yields a privacy-safe
  // click-to-load placeholder. Stripping would delete the video. The visible Avada notice
  // (.fusion-privacy-placeholder) is stripped separately in defaultNonContentSelectors.
  'data-privacy-src', // Avada privacy-embed facade.
  // Cookie-consent gates (CMPs) sit on the same recover side of that line. Each plugin rewrites
  // the author's embed iframe in place, dropping src and parking the real URL in its own
  // attribute, and feed bodies carry no consent flow: the gated iframe is the whole embed, and
  // every parked URL seen in the wild is a player or viewer (YouTube, Bandcamp, Vimeo,
  // SoundCloud, Spotify, PeerTube, Google docs/maps). The tracking iframes CMPs gate live in
  // page chrome, which never reaches feed content. Real Cookie Banner parks the same URL plus
  // autoplay=1 in consent-click-original-src-_ on the same iframe, so the non-autoplay
  // attribute is listed first and wins. OneTrust, CookieFirst and Cookie Script park theirs in
  // data-src, already listed above. Gated <script> tags and the notice elements a few plugins
  // serialize next to the iframe stay stripped in defaultNonContentSelectors.
  'consent-original-src', // Consent wrappers (generic form): kept beside the suffixed form.
  'consent-original-src-_', // Real Cookie Banner.
  'consent-click-original-src-_', // Real Cookie Banner click-to-load variant: fallback only.
  'src-consent', // Borlabs Cookie.
  'data-cookieblock-src', // Cookiebot: the attribute is the only URL copy.
  'data-src-cmplz', // Complianz: src holds the plugin's placeholder video or about:blank.
  'data-consent-src', // Cookie Information / Publii Embed Consent.
  'data-wpconsent-src', // WPConsent.
  'data-suppressedsrc', // iubenda.
  'data-uc-src', // Usercentrics.
  'data-gdpr-iframesrc', // Moove GDPR Cookie Compliance.
  // EmbedPlus parks the deferred player's URL here. The plugin's facade shape is rebuilt by
  // rebuildEmbedPlusEmbeds.
  'data-ep-src', // EmbedPlus YouTube deferred player.
  'data-lazy-load', // JetElements / Woodmart / Elementor lazy video widgets.
]

export const defaultDeferredIframeSources: Array<DeferredIframeSource> = [
  // Pym.js (NPR): the established responsive-embed convention; skip already-initialized nodes.
  { selector: '[data-pym-src]:not([data-pym-auto-initialized])', attribute: 'data-pym-src' },
  // @newswire/frames (Ryan Murphy; Texas Tribune bundles it as newswireFrames).
  { selector: '[data-frame-src]', attribute: 'data-frame-src' },
  // The Drupal/CKEditor oEmbed convention parks the source url on the wrapper, so unlike the
  // two above the value is a watch page rather than a player: `youtube.com/watch`, `vimeo.com`,
  // `listen.style/p`. That is fine here, because convertWidgets asks the resolvers what the url
  // means and they mint the player from it. A host nobody resolves becomes a placeholder
  // carrying the url, which is what those feeds show today anyway.
  //
  // Scoped to a wrapper holding no player. In most feeds the iframe is already inside, and this
  // transform replaces the element it matches, so an unscoped entry would throw away a working
  // iframe along with the width and height it states.
  {
    selector: '[data-oembed-url]:not(:has(iframe, embed, object, video, audio))',
    attribute: 'data-oembed-url',
  },
]

export const defaultLazySrcsetAttributes = [
  'data-srcset', // lazysizes / vanilla-lazyload / lozad / bLazy / generic.
  'data-tf-srcset', // Avada / Fusion ThemeBuilder.
  'data-lazy-srcset', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load.
  'data-image-srcset', // Generic / Squarespace-style: often empty.
  'data-modal-srcset', // Modal / lightbox component.
  'data-splide-lazy-srcset', // Splide.js carousel.
  'data-alt-srcset', // Generic alternate variant.
  'fifu-data-srcset', // "Featured Image From URL" WP plugin: often empty.
  'data-thumb-srcset', // WordPress thumbnail variant: often empty.
  'data-vp-popup-img-srcset', // Visual Portfolio popup.
  'data-original-srcset', // Legacy lazy-loaders: often empty.
  'data-pswp-srcset', // PhotoSwipe lightbox.
  'data-nectar-img-srcset', // Salient theme (Nectar).
  'nitro-lazy-srcset', // NitroPack. Non-`data-*` prefix.
  'data-flickity-lazyload-srcset', // Flickity carousel.
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

export const defaultEmojiImageHosts = [
  's.w.org/images/core/emoji/', // WordPress core wp-emoji-release output.
  's0.wp.com/wp-content/mu-plugins/wpcom-smileys/', // WordPress.com Twemoji assets.
  'fbcdn.net/images/emoji.php/', // Facebook embedded posts.
  'cdn.jsdelivr.net/gh/twitter/twemoji', // Twemoji via jsDelivr, used by IPS and others.
  'cdn.jsdelivr.net/joypixels/assets/', // JoyPixels CDN, incl. XenForo emoji mode.
  'twemoji.maxcdn.com/', // Twemoji's retired CDN, still linked from older posts.
  'abs.twimg.com/emoji/', // Twitter / X embedded tweets.
  'githubassets.com/images/icons/emoji/', // GitHub README scrapings.
  'assets.github.com/images/icons/emoji/', // GitHub's pre-2018 asset host; seen in archived feeds.
]

// Hosts that only ever serve author avatars. WordPress / WP.com attaches the
// author's gravatar as a per-item media:content image, so an otherwise imageless
// post would inject the author's face as its lead image. Matched by host and
// subdomain, so the sharded 0/1/2.gravatar.com and secure.gravatar.com are covered.
export const defaultAvatarImageHosts = [
  'gravatar.com', // WordPress / WP.com per-item author gravatar as media:content.
]

// CSS class tokens that mark a <pre> as author-chosen distinct content
// (poetry stanzas, scriptural verses, leader-dotted tables of contents).
// `mergeConsecutiveOneLinerPres` skips any run where at least one <pre>
// carries one of these tokens. Of all
// matching runs, `wp-block-verse` and `wp-block-preformatted` dominate
// the false-positive cases (split poems, ToCs), while `wp-block-code`
// stays out: fragmented code blocks are the merge's intended target.
export const defaultPreservedPreClasses = [
  'wp-block-verse', // WordPress Gutenberg Verse block: poems, lyrics, scripture stanzas.
  'wp-block-preformatted', // WordPress Gutenberg Preformatted block: author-chosen distinct blocks (ToCs, quotes, numbered headings).
]

export const defaultNonContentSelectors = [
  // Subscribe and newsletter signup forms.
  '[data-component-name="SubscribeWidget"]', // Substack inline subscribe widget.
  '.subscription-widget-wrap-editor', // Substack paywall / subscribe CTA.
  // The same subscribe form as the wrap below, arriving as Substack's other snippet. The path is
  // anchored so a post embed (`/embed/post/{id}`) is not caught by it.
  'iframe[src*=".substack.com/"][src$="/embed"]',
  '.wp-block-jetpack-subscriptions', // Jetpack Gutenberg subscribe block.
  '.kg-signup-card', // Ghost (Koenig) signup card.
  '.mc4wp-form', // Mailchimp for WordPress plugin form.
  '.formkit-form', // ConvertKit / Kit subscribe form.
  'iframe[src*="embeds.beehiiv.com"]', // Beehiiv embed iframe.
  '.jetpack_subscription_widget', // Jetpack legacy sidebar subscribe widget.
  'form[action*="buttondown.email"]', // Buttondown embed-subscribe form; mentions of the host are nearly all plain links.
  '.sqs-block-newsletter', // Squarespace newsletter block.
  // Bloom (Elegant Themes) optin. The bare `.et_bloom` class does not exist on any element in
  // the wild: the tokens are `et_bloom_bottom_trigger`, `et_bloom_fields` and so on, and a
  // class selector matches whole tokens, so it stripped nothing. Matched on the prefix instead.
  // Most of what that reaches is the empty trigger span, which stripEmptyTags already removed;
  // the few feeds carrying the popup form are what this actually gains.
  '[class*="et_bloom"]',
  '.wpforms-container', // WPForms.
  '[class*="tve-leads"]', // Thrive Leads optin.

  // Ad slots.
  '.adsbygoogle', // Google AdSense ad slot.
  'div[id^="div-gpt-ad"]', // Google Ad Manager (GPT) ad slot.
  '.adthrive-ad', // AdThrive (Raptive) ad slot.
  'amp-ad', // AMP ad slot.
  'amp-auto-ads', // AMP auto-ads placement marker.
  'amp-sticky-ad', // AMP sticky bottom ad bar.
  'amp-sticky-ad-top-padding', // AMP runtime spacer holding room for the sticky ad bar.

  // Tracking beacons, which render nothing at all.
  'amp-pixel', // AMP tracking pixel.
  'amp-analytics', // AMP analytics element, a JSON config for its runtime.

  // Share and call-to-action button clusters.
  '.captioned-button-wrap', // Substack caption + CTA button (Share/Subscribe/Comment).
  // Substack's ButtonCreateButton, its CTA button outside a captioned wrap. The component wraps
  // author-authored buttons too (donation links, "Read <post title>"), and Elementor emits the
  // same button-wrapper class, so the platform action in the href is what is matched rather than
  // the component or the class.
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/subscribe"])',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/comments"])',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="action=share"])',
  '[class*="social-share"]', // Generic social-share button cluster.
  '[class*="share-buttons"]', // Generic social-share button cluster.
  '.sharethis-inline-share-buttons', // ShareThis inline share buttons.
  '.sharedaddy', // Jetpack Sharedaddy share buttons.
  '.feedflare', // FeedBurner share footer ("Share on X / Email this").
  '.addtoany_share_save_container', // AddToAny share buttons (WordPress).
  // The AddToAny anchor itself. Usually empty, where stripEmptyTags already removed it. This is
  // for the variant that carries an image or text and survives as a "Share" button.
  'a.addtoany_share_save',
  // Survives as a live "Tweet" link in the output, usually with no other non-content selector
  // matching anywhere.
  'a.twitter-share-button',
  // Drupal Easy Social. The widget is chrome, but the pipeline cannot tell, so its Facebook
  // Like iframe becomes an embed placeholder card and the chrome is promoted to content.
  'div.easy_social_box',
  '.a2a_kit', // AddToAny share icons (higher-prevalence marker than the wrapper).
  '[class*="addthis_"]', // AddThis share toolbox.
  '.shareaholic-canvas', // Shareaholic share/related widget.
  'amp-social-share', // AMP share button.

  // Theme and plugin social clusters, each one its own vendor namespace rather than a generic
  // class the two [class*=] entries above already reach.
  '.wp-block-social-links', // WordPress core social-links block (follow icons).
  '.et_pb_social_media_follow', // Divi social-media-follow module.
  '.elementor-social-icons-wrapper', // Elementor social-icons widget (follow icons).
  '.rrssb-buttons', // Ridiculously Responsive Social Sharing Buttons.
  '.simplesocialbuttons', // SimpleSocialButtons share bar.
  // Synved Social Share renders no wrapper, so the anchors are siblings of the post's own
  // paragraphs and the button itself is the only thing there is to match.
  'a.synved-social-button', // Synved Social Share buttons.
  // GemPages (Shopify page builder) social-share module. The wrapper's class is only
  // "module-wrap", so the [class*=] entries above never reach it.
  '[data-key="social-share"]',
  '.av-share-box', // Enfold theme "Share this entry" box.

  // Related-posts widgets.
  '.yarpp-related', // YARPP related-posts widget (WordPress).
  '.jp-relatedposts', // Jetpack related-posts carousel.
  '.crp_related', // Contextual Related Posts WordPress plugin.

  // Author bio blocks.
  '.wp-block-post-author', // WordPress Gutenberg author bio block.
  '.saboxplugin-wrap', // Simple Author Box WordPress plugin.

  // Excerpt-truncation links. Anchor-scoped so wrappers holding real content survive.
  'a[class*="read-more"]', // "Read more" excerpt-truncation links.
  'a[class*="continue-reading"]', // "Continue reading" excerpt-truncation links.

  // Comment-system embeds (JS mounts that render nothing without their loader script).
  '.fb-comments', // Facebook Comments.

  // Breadcrumb trails, carried into the item by themes that put the page hero into the content
  // field. Gated on a navigation element or a plugin class, because the bare word also names
  // recipes and articles about breadcrumbs.
  'nav.breadcrumb', // Theme breadcrumb trail.
  'nav.breadcrumbs', // Theme breadcrumb trail, plural spelling.
  'nav[aria-label^="breadcrumb" i]', // ARIA-labelled breadcrumb trail, singular or plural.
  '[role="navigation"][aria-label^="breadcrumb" i]', // The same trail on a div with a navigation role.
  '.aioseo-breadcrumbs', // All in One SEO breadcrumb trail.

  // Print / PDF buttons.
  '.printfriendly', // PrintFriendly print/PDF button.
  '.pf-button', // PrintFriendly button.

  // Platform UI chrome and non-rendered scaffolding.
  '.image-link-expand', // Substack restack/zoom buttons next to images.
  'drupal-render-placeholder', // Drupal lazy-render markers for comments/forms/flag widgets.
  '.mcnPreviewText', // Mailchimp hidden email preheader text.
  '.tmblr-alt-text-helper', // Tumblr badge rendering a stray "ALT" beside an image that keeps its own alt attribute.
  'img[src*="steamcommunity.com"][src*="placeholder"]', // Steam news static poster gif shown before its JS swaps in the YouTube iframe.

  // GDPR/consent-gated embeds are recovered, not stripped: each CMP parks the author's embed
  // URL on the iframe itself, so fixLazyIframes promotes it back into src (see the CMP block in
  // defaultLazyIframeAttributes). What stays stripped here is the part that renders as chrome.
  // Real Cookie Banner also gates <script> tags (adsbygoogle, Vimeo player.js). Script-scoped so
  // the gated scripts still go while the gated iframes are recovered.
  'script[consent-original-src-_]', // Real Cookie Banner gated scripts.
  '.cookieconsent-optout-marketing', // Cookiebot "please accept marketing cookies" notice beside the gated iframe.
  '.pec-overlay', // Publii Embed Consent click-to-accept overlay beside the gated iframe.
  // OneTrust video fallback: thumbnail plus "enable cookies to view this content" text and a
  // settings link, serialized as a sibling of the gated iframe inside the wrapper.
  '.onetrust-css-video-wrapper .fallback-container', // OneTrust video fallback notice.
  // Avada's leftover "For privacy reasons … please accept" notice. The gated iframe itself is
  // recovered via data-privacy-src (a lazy attribute); only this consent nag is dead chrome.
  '.fusion-privacy-placeholder', // Avada privacy-embed notice.
  // AMP's own gate follows the same split. The element holds the config and the prompt UI and
  // nothing else, since whatever it gates carries data-block-on-consent and sits elsewhere in
  // the document, so removing it takes the nag and leaves the gated element to be recovered.
  'amp-consent', // AMP consent gate.
  // s9e MediaEmbed (forum software) wraps its player in a sizing span. Where the feed generator
  // stripped the iframe out of it, what survives is the wrapper around the literal word
  // "iframe", which renders as that word in the middle of the post. Scoped to a wrapper holding
  // no player, so the ones whose iframe survived are untouched. The video id is nowhere in the
  // markup, so there is nothing to recover here, only chrome to remove.
  'span[data-s9e-mediaembed]:not(:has(iframe, embed, object, video, audio))',
]
