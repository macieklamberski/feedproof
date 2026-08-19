---
title: Transforms
---

# Transforms

A transform is a single, focused pass over the content. Feedsweep runs two phases: string transforms operate on the raw HTML text before parsing, DOM transforms operate on the parsed document. The default pipeline runs 5 string transforms and 73 DOM transforms; 3 more DOM transforms are opt-in [heuristics](/transforms/heuristics).

Every transform is idempotent: running the pipeline twice produces the same output as running it once, and every transform is tested for exactly that.

## Running a Subset

The `stringTransforms` and `domTransforms` options replace the default arrays entirely, and nothing is merged. To extend the defaults, spread them:

```typescript
import { defaultStandardDomTransforms, transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent(content, {
  parseHtmlFn: parseHtml,
  domTransforms: [...defaultStandardDomTransforms, myTransform],
})
```

Setting `heuristics: true` selects the extended pipeline with the 3 opt-in transforms spliced in. It is ignored when `domTransforms` is set. See [Custom Transforms](/guides/customization/custom-transforms) for writing your own.

> [!IMPORTANT]
> No caller-supplied function may throw. A transform (or option callback) that throws rejects the whole `transformContent` promise.

## All Transforms

| Transform | Group | Description |
|-----------|-------|-------------|
| `stripControlChars` | [String](/transforms/string) | Remove control characters and Unicode noncharacters from the raw HTML |
| `stripOversizedBase64Sources` | [String](/transforms/string) | Drop base64 `src` payloads over 50 KB before they bloat the DOM |
| `unwrapCdataComments` | [String](/transforms/string) | Unwrap `<!--[CDATA[…]]-->` comment artifacts so the body is not stripped as a comment |
| `unwrapCdataMarkers` | [String](/transforms/string) | Unwrap a value that is one whole escaped `<![CDATA[…]]>` block |
| `paragraphizePlainText` | [String](/transforms/string) | Turn tag-less plain text into paragraphs and line breaks |
| `decodeDoubleEncodedTags` | [Text and Structure](/transforms/structure) | Rebuild HTML that a feed generator entity-escaped twice |
| `surfaceParkedMarkup` | [Embed Recovery](/transforms/embeds) | Dissolve a lazy-loader container into the encoded embed markup it holds |
| `stripComments` | [Content Cleanup](/transforms/cleanup) | Remove HTML comments |
| `stripHiddenElements` | [Content Cleanup](/transforms/cleanup) | Remove elements hidden via `hidden`, `display:none`, or `visibility:hidden` |
| `surfaceTemplateEmbeds` | [Embed Recovery](/transforms/embeds) | Hoist an embed trapped inside a `<template>` into the document |
| `surfaceNoscriptEmbeds` | [Embed Recovery](/transforms/embeds) | Hoist a recognized video iframe out of its `<noscript>` fallback |
| `rebuildEmbedPlusEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from an Embed Plus for YouTube facade |
| `rebuildLiteVideoEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a `lite-youtube` / `lite-vimeo` custom element |
| `rebuildLyteEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a WP YouTube Lyte facade |
| `rebuildRocketYoutubePreviews` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a WP Rocket YouTube preview |
| `rebuildVideoJsEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild a native `<video>` from a Video.js `<video-js>` element |
| `rebuildWistiaEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a Wistia JS-API facade |
| `rebuildLazyLoadForVideos` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a Lazy Load for Videos facade |
| `rebuildLazyYtEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe from a jQuery lazyYT facade |
| `rebuildElementorVideoEmbeds` | [Embed Recovery](/transforms/embeds) | Rebuild the iframe an Elementor video widget defers to JS |
| `rebuildEmbedlyEmbeds` | [Embed Recovery](/transforms/embeds) | Unwrap an Embedly media widget to its inner provider iframe |
| `linkifyGistEmbeds` | [Embed Recovery](/transforms/embeds) | Replace a GitHub Gist script embed with a link to the gist |
| `fixSubstackMentions` | [Text and Structure](/transforms/structure) | Rebuild a Substack @-mention into an inline profile link |
| `fixSubstackImageLinks` | [Media Recovery](/transforms/media) | Remint the image inside an emptied Substack lightbox anchor |
| `wrapCargoGalleryImages` | [Media Recovery](/transforms/media) | Wrap Cargo portfolio images in figures so they keep block boundaries |
| `convertAmpNativeElements` | [Media Recovery](/transforms/media) | Convert AMP custom elements that have a native equivalent into it |
| `convertNoteEmbeds` | [Embed Recovery](/transforms/embeds) | Convert note.com embed figures into iframes and links |
| `rebuildDeferredIframes` | [Embed Recovery](/transforms/embeds) | Materialize an iframe parked in a `<div>` attribute (Pym.js, @newswire/frames, oEmbed) |
| `convertDatawrapperEmbeds` | [Embed Recovery](/transforms/embeds) | Convert Datawrapper chart embeds into a linked static image |
| `convertGiphyEmbeds` | [Embed Recovery](/transforms/embeds) | Convert a Giphy iframe into the linked gif itself |
| `unwrapDoublyNestedLists` | [Text and Structure](/transforms/structure) | Dissolve a list nested directly inside another list |
| `stripDuplicateTitleHeading` | [Text and Structure](/transforms/structure) | Remove a leading heading that repeats the article title |
| `demoteHeadings` | [Text and Structure](/transforms/structure) | Demote `h1`–`h5` one level when the body contains an `h1` |
| `canonicalizeAlignment` | [Media Recovery](/transforms/media) | Resolve alignment signals into a `data-align` attribute on the media |
| `convertLazyImageContainers` | [Media Recovery](/transforms/media) | Recover a real `<img>` from a media-less lazy-image container |
| `fixLazyImages` | [Media Recovery](/transforms/media) | Promote a lazy image URL from its `data-*` attribute into `src` / `srcset` |
| `fixLazyVideos` | [Media Recovery](/transforms/media) | Promote a lazy video `src` and poster into their real attributes |
| `fixLazyAudios` | [Media Recovery](/transforms/media) | Promote a lazy audio `src` into the real attribute |
| `removeTrackingPixels` | [Media Recovery](/transforms/media) | Remove tracking pixels and beacon images |
| `resolveMediaDimensions` | [Media Recovery](/transforms/media) | Backfill `width` / `height` from style, URL hints, or the wrapping picture |
| `flattenPictureElements` | [Media Recovery](/transforms/media) | Collapse each `<picture>` to a single `<img>`, keeping the modern format |
| `hoistFigcaptionFromAnchor` | [Media Recovery](/transforms/media) | Move a `<figcaption>` out of a figure-wide click-through anchor |
| `stripNonContentElements` | [Content Cleanup](/transforms/cleanup) | Remove platform chrome: subscribe forms, share clusters, ad slots, and similar |
| `resolveRelativeUrls` | [Links and URLs](/transforms/urls) | Resolve relative URLs against the item's base URL |
| `cleanAnchorUrls` | [Links and URLs](/transforms/urls) | Clean link URLs through the caller's `cleanUrlFn` |
| `shortenSamePageLinkFragments` | [Links and URLs](/transforms/urls) | Re-localize absolutized in-page fragment links back to `#fragment` |
| `normalizeAnchoredHeadings` | [Text and Structure](/transforms/structure) | Collapse heading permalink markup to one canonical anchor form |
| `stripDeadAnchors` | [Links and URLs](/transforms/urls) | Unwrap anchors that link nowhere |
| `convertCiteCards` | [Widgets](/widgets) | Read link-preview cards into `data-cite-*` placeholders |
| `unwrapEmojiImages` | [Media Recovery](/transforms/media) | Replace platform emoji images with the real glyph, or mark them `data-emoji` |
| `stripMarkdownEscapeBackslashes` | [Text and Structure](/transforms/structure) | Empty paragraphs holding a lone Markdown escape backslash |
| `convertBreaksToParagraphs` | [Text and Structure](/transforms/structure) | Convert `<br>`-separated prose into real paragraphs |
| `replacePreLineBreaks` | [Code Blocks](/transforms/code) | Replace `<br>` inside `<pre>` with real newlines |
| `unwrapNestedCodeWrappers` | [Code Blocks](/transforms/code) | Dissolve a redundant `<code>` inside `<code>` (or `<pre>` inside `<pre>`) |
| `highlightCode` | [Code Blocks](/transforms/code) | Syntax-highlight labeled code blocks |
| `wrapBareInlineInParagraphs` | [Text and Structure](/transforms/structure) | Wrap bare inline runs in paragraphs |
| `stripLeadingIndentation` | [Text and Structure](/transforms/structure) | Strip decorative leading indentation from prose |
| `stripInterBlockBreaks` | [Text and Structure](/transforms/structure) | Remove redundant `<br>` between block elements |
| `stripBoundaryBreaks` | [Text and Structure](/transforms/structure) | Remove `<br>` at block boundaries |
| `mergeFragmentedLists` | [Text and Structure](/transforms/structure) | Merge a list split into consecutive fragments |
| `mergeConsecutiveOneLinerPres` | [Code Blocks](/transforms/code) | Merge runs of one-line `<pre>` blocks into one |
| `trimPreWhitespace` | [Code Blocks](/transforms/code) | Trim leading and trailing blank lines inside `<pre>` |
| `stripWordBreaks` | [Text and Structure](/transforms/structure) | Remove `<wbr>` so bare URLs linkify whole |
| `linkifyUrls` | [Links and URLs](/transforms/urls) | Turn bare URLs in text into links |
| `markTimestamps` | [Links and URLs](/transforms/urls) | Mark line-leading `mm:ss` timestamps with `data-timestamp` |
| `fixLazyIframes` | [Embed Recovery](/transforms/embeds) | Promote a lazy or consent-gated iframe URL into `src` |
| `convertWidgets` | [Widgets](/widgets) | Convert embeds into `data-embed-*` placeholders and platform media into native elements |
| `injectEnclosures` | [Enclosures](/guides/enclosures) | Inject feed enclosures as native media or embed placeholders |
| `enrichEmbedPlaceholders` | [Widgets](/widgets) | Fill embed placeholder metadata via the caller's `enrichEmbedFn` |
| `enrichCitePlaceholders` | [Widgets](/widgets) | Fill cite placeholder metadata via the caller's `enrichCiteFn` |
| `neutralizeUnsafeUrls` | [Links and URLs](/transforms/urls) | Replace dangerous-scheme URLs with inert sentinels |
| `proxyAssetUrls` | [Links and URLs](/transforms/urls) | Rewrite asset URLs through the caller's `assetProxyFn` |
| `stripEmptyTags` | [Text and Structure](/transforms/structure) | Remove empty elements that render nothing |
| `unwrapHeadingBold` | [Text and Structure](/transforms/structure) | Unwrap a `<b>`/`<strong>` that spans a whole heading |
| `unwrapWrappers` | [Text and Structure](/transforms/structure) | Dissolve meaningless wrapper elements |
| `stripDuplicateRules` | [Text and Structure](/transforms/structure) | Remove consecutive duplicate `<hr>` rules |
| `wrapTablesForScroll` | [Text and Structure](/transforms/structure) | Wrap tables in a `data-table` scroll container |
| `hoistBlocksFromParagraphs` | [Text and Structure](/transforms/structure) | Hoist block elements out of paragraphs |
| `assignVideoPosters` | [Heuristics](/transforms/heuristics) | Connect a neighboring thumbnail image to a posterless video |
| `stripDuplicateEnclosures` | [Heuristics](/transforms/heuristics) | Remove injected enclosures that duplicate inline content |
| `stripDuplicateLeadingImages` | [Heuristics](/transforms/heuristics) | Remove a leading image duplicated by the item's featured image |

The table lists transforms in pipeline order: string transforms first, then DOM transforms, then the opt-in heuristics. Order within the DOM phase matters, because many transforms depend on an earlier one having normalized the markup they read.
