# Feedsweep

[![codecov](https://codecov.io/gh/macieklamberski/feedsweep/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/feedsweep)
[![npm version](https://img.shields.io/npm/v/feedsweep.svg)](https://www.npmjs.com/package/feedsweep)
[![license](https://img.shields.io/npm/l/feedsweep.svg)](https://github.com/macieklamberski/feedsweep/blob/main/LICENSE)

Tidy up the HTML content in web feeds. Fix feed-specific quirks so content displays in its best possible form.

Feedsweep takes raw feed item HTML and runs it through a pipeline that genuinely improves the output: fixing lazy-loaded images so they actually render, resolving relative URLs to absolute, stripping tracking pixels for privacy (plus tracking params and redirect wrappers via the cleanUrlFn option), highlighting code blocks, normalizing broken markup from common feed quirks, auto-linking bare URLs, and converting embeds into framework-agnostic placeholders. It ships with sensible defaults, so the common video, audio and chart providers (YouTube, Vimeo, SoundCloud and more) are recognized without any configuration.

## Installation

```bash
npm install feedsweep linkedom
```

`linkedom` is an optional peer dependency. You only need it if you use the bundled `parseHtml` helper — see [DOM library](#dom-library) for jsdom / happy-dom / browser-native alternatives.

## Quick Start

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const result = await transformContent('<p>Check <img data-src="photo.jpg"> and visit /about</p>', {
  parseHtmlFn: parseHtml,
  baseUrl: 'https://example.com/post/1',
})
```

## Transforms

Inventory of every transform exported from the package. Most are enabled by default; pass a custom `stringTransforms` / `domTransforms` array via `transformContent` options to override. Transforms marked _Heuristic (opt-in)_ make a best-judgement guess and may drop content, so they are excluded from the standard pipeline — enable them with `heuristics: true` (see Options).

| Transform | Description |
| --- | --- |
| `decodeDoubleEncodedTags` | Decode double-escaped tags (`&lt;tag&gt;`) back to real HTML |
| `fixLazyImages` | Promote lazy-loaded `data-src` / `data-original` to real `src` |
| `fixLazyIframes` | Promote a lazy or consent-parked iframe `src` (real URL in a `data-*` attribute) to real `src`, skipping placeholder pages |
| `fixLazyVideos` | Promote a lazy `<video>` src and `data-poster` to real attributes |
| `fixLazyAudios` | Promote a lazy `<audio>` src to real `src` |
| `convertLazyImageContainers` | Convert a container parking an image URL in a lazy attribute into a real `<img>` |
| `flattenPictureElements` | Collapse `<picture>` to one `<img>`, keeping the best modern-format source |
| `hoistFigcaptionFromAnchor` | Move a `<figcaption>` out of the figure's click-through link |
| `canonicalizeAlignment` | Normalize media alignment into a single `data-align` hook |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` blocks into one |
| `replacePreLineBreaks` | Replace `<br>` with newlines inside `<pre>` |
| `stripInterBlockBreaks` | Remove stray `<br>` tags between block elements |
| `stripBoundaryBreaks` | Remove `<br>` tags at block boundaries |
| `stripDuplicateTitleHeading` | Remove a leading heading that repeats the article title |
| `demoteHeadings` | Shift headings down a level so they sit below the reader's page title |
| `unwrapHeadingBold` | Unwrap redundant bold wrapping a whole heading |
| `normalizeAnchoredHeadings` | Strip static-site-generator permalink anchors from headings (Sphinx/MkDocs, Docusaurus, AnchorJS, Zola) |
| `cleanAnchorUrls` | Clean anchor hrefs (redirects, tracking params) via the `cleanUrlFn` option |
| `stripDeadAnchors` | Unwrap links with empty, `#`, or `javascript:` hrefs |
| `stripNonContentElements` | Strip non-content chrome — subscribe/share/related widgets, ads, author bios |
| `stripHiddenElements` | Strip elements hidden from view (`hidden` attribute, inline `display:none` / `visibility:hidden`) |
| `removeTrackingPixels` | Strip 1×1 tracking pixels, keeping real images |
| `unwrapEmojiImages` | Replace emoji and forum smilie markup with the real glyph, marking with `data-emoji` the images and fallback text that have none |
| `resolveMediaDimensions` | Backfill `width`/`height` on media so aspect ratio survives style stripping |
| `convertBreaksToParagraphs` | Convert `<br><br>` runs into real `<p>` blocks |
| `wrapBareInlineInParagraphs` | Wrap loose inline content in `<p>` blocks |
| `hoistBlocksFromParagraphs` | Hoist block elements out of enclosing paragraphs, keeping only halves that still render |
| `wrapCargoGalleryImages` | Wrap Cargo portfolio captions and images in `<figure>` blocks so they stay apart |
| `injectEnclosures` | Inject feed enclosures as native media or embed placeholders, merging a player page entry with its media file; an image enclosure injects only when the content has no image of its own |
| `surfaceParkedMarkup` | Dissolve a lazy-loader container (`div.load-later[data-content]`) into the percent-encoded embed markup it holds, whatever platform that turns out to be |
| `surfaceTemplateEmbeds` | Hoist a video embed out of a lazy-load `<template>` (e.g. Better Core Video Embeds) so it renders in a reader |
| `surfaceNoscriptEmbeds` | Hoist a video `<iframe>` out of a `<noscript>` lazy-load fallback (e.g. WP Rocket, a3 Lazy Load); ignores non-video noscript iframes like Google Tag Manager |
| `rebuildEmbedPlusEmbeds` | Rebuild a real `<iframe>` from an "Embed Plus for YouTube" facade (`.epyt-facade[data-facadesrc]`) |
| `rebuildLiteVideoEmbeds` | Rebuild a real `<iframe>` from a `lite-youtube` / `lite-vimeo` web component's `videoid`, carrying over `start` and `videotitle` |
| `rebuildLyteEmbeds` | Rebuild a real `<iframe>` from a WP YouTube Lyte facade (`WYL_`/`lyte_` id) |
| `rebuildRocketYoutubePreviews` | Rebuild a real `<iframe>` from a WP Rocket YouTube preview facade (`.rll-youtube-player[data-id]`), carrying over `data-query` |
| `rebuildWistiaEmbeds` | Rebuild a real `<iframe>` from a Wistia JS-API inline embed facade (`wistia_async_{id}` class) |
| `rebuildLazyLoadForVideos` | Rebuild a real `<iframe>` from a "Lazy Load for Videos" facade (`a.preview-lazyload`), recovering the YouTube/Vimeo id from `data-video-uri` or `href` and carrying over `data-video-title` |
| `rebuildLazyYtEmbeds` | Rebuild a real `<iframe>` from a jQuery lazyYT facade (`div.lazyYT[data-youtube-id]`) |
| `rebuildElementorVideoEmbeds` | Rebuild a real `<iframe>` from an Elementor video widget's deferred `data-settings` (YouTube / Vimeo / Dailymotion / VideoPress) |
| `rebuildEmbedlyEmbeds` | Unwrap an Embedly media widget to the inner provider iframe, carrying the poster as `data-thumbnail` |
| `rebuildDeferredIframes` | Rebuild a real `<iframe>` from a URL parked in a `<div>` attribute (Pym.js `data-pym-src`, @newswire/frames `data-frame-src`) |
| `linkifyGistEmbeds` | Replace a GitHub Gist script embed or `<amp-gist>` with a link to the gist |
| `fixSubstackMentions` | Rebuild a Substack @-mention (empty `span.mention-wrap`) into an inline `<a>@name</a>` link, so the name survives instead of vanishing mid-sentence |
| `fixSubstackImageLinks` | Remint the `<img>` inside an emptied Substack lightbox anchor (`a.image-link` whose image child was stripped) from the anchor's own image href |
| `convertNoteEmbeds` | Convert note.com's empty embed figures (`figure[embedded-service][data-src]`): media services become plain iframes for the widget pass, own-post embeds become plain links |
| `convertAmpNativeElements` | Convert AMP custom elements with a native equivalent (`amp-img`, `amp-anim`, `amp-video`, `amp-audio`, `amp-iframe`) into that element |
| `convertDatawrapperEmbeds` | Convert Datawrapper chart embeds (iframe, script/noscript, and link forms) into a static image linking to the interactive chart |
| `convertWidgets` | Convert recognized widgets: embeds become `data-embed-*` placeholders, platform-hosted media becomes a real `<video>`/`<audio>` (from an id template, a media-file src, or a URL parked in a `mediaSrcAttributes` attribute) |
| `assignVideoPosters` | _Heuristic (opt-in):_ move a redundant video-poster image (inline or an enclosure) onto the embed as its poster, then drop the standalone image |
| `stripDuplicateEnclosures` | _Heuristic (opt-in):_ remove an injected enclosure that duplicates inline content (image size-variants, exact audio/video/embed) |
| `stripDuplicateLeadingImages` | _Heuristic (opt-in):_ remove a leading image the body repeats as the very next image (featured-image prepends), keeping the larger copy |
| `convertCiteCards` | Convert link-preview cards into `data-cite-*` placeholders |
| `convertGalleries` | Convert multi-image galleries and slideshows into `data-gallery-*` placeholders carrying an items JSON plus a per-image `<figure>` fallback |
| `enrichEmbedPlaceholders` | Fill placeholder metadata via the caller's `enrichEmbedFn` (no-op unless set) |
| `enrichCitePlaceholders` | Fill cite placeholder metadata via the caller's `enrichCiteFn` (no-op unless set) |
| `neutralizeUnsafeUrls` | Replace dangerous-scheme URLs (and any the `isSafeUrlFn` option rejects) with an inert sentinel, keeping the element |
| `proxyAssetUrls` | Rewrite media URLs through a caller-supplied proxy, keeping each original in `data-proxied-<attr>` |
| `resolveRelativeUrls` | Resolve relative URLs to absolute against the base URL |
| `shortenSamePageLinkFragments` | Shorten absolute in-page links back to bare `#fragment` hrefs |
| `unwrapWrappers` | Remove redundant outer `<div>` / `<article>` / `<section>` wrappers |
| `unwrapDoublyNestedLists` | Unwrap a list that only wraps a single same-type list |
| `wrapTablesForScroll` | Wrap tables in a horizontal-scroll container |
| `mergeFragmentedLists` | Merge consecutive sibling lists of the same type |
| `paragraphizePlainText` | Wrap bare plain text in `<p>` tags |
| `stripOversizedBase64Sources` | Drop oversized inline base64 media sources before parsing |
| `stripWordBreaks` | Remove `<wbr>` tags so split URLs rejoin before linkifying |
| `linkifyUrls` | Wrap bare URLs in links |
| `markTimestamps` | Wrap line-leading timestamps for player seeking |
| `stripLeadingIndentation` | Strip fake leading indentation (nbsp / fixed-width spaces) from block text |
| `trimPreWhitespace` | Remove shared leading indentation from `<pre>` blocks |
| `unwrapNestedCodeWrappers` | Collapse redundant `code`-in-`code` / `pre`-in-`pre` double-wraps |
| `highlightCode` | Syntax-highlight code blocks that declare a language and expose the language for a badge |
| `stripDuplicateRules` | Collapse a run of thematic breaks to the first one |
| `stripMarkdownEscapeBackslashes` | Strip leaked Markdown escape backslashes at paragraph starts |
| `stripEmptyTags` | Remove empty elements |
| `stripComments` | Remove HTML comments |
| `unwrapCdataComments` | Unwrap malformed `<!--[CDATA[ … ]]-->` wrappers before parsing |
| `unwrapCdataMarkers` | Unwrap a whole-value `<![CDATA[ … ]]>` marker so content isn't dropped |
| `stripControlChars` | Strip rendering-hostile control characters before parsing |

## Options

```typescript
import {
  fixLazyImages,
  ghostCiteResolver,
  resolveRelativeUrls,
  transformContent,
  wordpressGalleryResolver,
  youtubeIframeEmbedResolver,
} from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'
import { cleanUrl } from 'urlpurify'

const result = transformContent(html, {
  // Required: function that turns an HTML string into a `Document`. See "DOM library".
  parseHtmlFn: parseHtml,
  // Base URL for resolving relative URLs.
  baseUrl: 'https://example.com/post/1',
  // Rewrite anchor hrefs: unwrap redirects and strip tracking params.
  cleanUrlFn: cleanUrl,
  // Feed item enclosures (audio/video/image), injected into the content.
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Route image/video/audio URLs through a proxy. Return `undefined` to leave a URL untouched.
  assetProxyFn: (url, type) => `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`,
  // Extra URL safety policy (e.g. SSRF/allowlist); return `false` to neutralize. A dangerous-scheme floor always applies.
  isSafeUrlFn: (url, type) => isSafe(url, type),
  // Populate embed placeholder metadata from a remote source (e.g. YouTube oEmbed).
  enrichEmbedFn: async (embeds) => {
    return new Map(embeds.map(({ provider, id }) => [`${provider}:${id}`, { title: '…' }]))
  },
  // Normalize a cite card's site-formatted display date (e.g. "2018.10.14"); return
  // undefined to keep the raw string verbatim.
  parseDateFn: (raw) => parseDate(raw),
  // Swap the code highlighter (defaults to highlight.js; may be async).
  highlightFn: (text, language) => myHighlighter.highlight(text, language),
  // Widget resolvers: embed results become placeholders, media results become real
  // <video>/<audio> elements.
  widgetResolvers: [youtubeIframeEmbedResolver, myEmbedResolver],
  // Resolvers turning link-preview cards into `data-cite-*` placeholders.
  citeResolvers: [ghostCiteResolver, myCiteResolver],
  // Resolvers turning multi-image galleries into `data-gallery-*` placeholders.
  galleryResolvers: [wordpressGalleryResolver, myGalleryResolver],
  // Opt into the heuristic transforms. Ignored if a custom domTransforms is set.
  heuristics: true,
  // Run a custom DOM transform pipeline (omit to use defaults).
  domTransforms: [fixLazyImages, resolveRelativeUrls],
})
```

All caller-provided functions (`parseHtmlFn`, `resolveUrlFn`, `cleanUrlFn`, `assetProxyFn`, `isSafeUrlFn`, `enrichEmbedFn`, `parseDateFn`, `highlightFn`, and resolver extracts) must not throw — an exception is not caught and rejects the `transformContent` promise.

Code blocks are highlighted only when they declare a language (`language-*` class, `data-language`, Pandoc/Rouge/Expressive Code/etc.); unlabeled blocks are left plain rather than guessed at. The default highlighter is highlight.js (exported as `defaultHighlightFn` / `hljsHighlightFn`); replace it with `highlightFn`.

The `stringTransforms` and `domTransforms` options each fully replace the corresponding default phase when provided. The `heuristics` flag (default `false`) selects between two exported DOM pipelines: `defaultStandardDomTransforms` (the safe defaults) and `defaultAllDomTransforms` (standard plus `heuristicDomTransforms` spliced in after `injectEnclosures`). Setting `domTransforms` explicitly overrides `heuristics`. Every transform and pipeline is also exported individually from `feedsweep`, so you can compose any pipeline — list transforms explicitly, or spread `defaultStandardDomTransforms` / `heuristicDomTransforms` to extend or filter the defaults.

`widgetResolvers`, `citeResolvers`, and `galleryResolvers` each fully replace their default resolver list when provided; omit them for the defaults. Every resolver is exported individually from `feedsweep`, so a custom list is composed by naming the built-ins you want alongside your own.

Embed resolvers are named `{service}EmbedResolver` where a service ships one, and `{service}{Carrier}EmbedResolver` where it ships several, since the carrier is the only thing that differs between them: `buzzsproutIframeEmbedResolver` beside `buzzsproutScriptEmbedResolver`, `brightcoveVideoJsEmbedResolver` beside `brightcoveFlashEmbedResolver`.

## DOM library

Feedsweep is parser-agnostic. You provide `parseHtmlFn` — a function that turns an HTML string into a `Document`. Use any DOM library that produces a standards-compliant `Document`. The test suite runs the full pipeline against both linkedom and jsdom.

```typescript
// linkedom (recommended default)
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

await transformContent(html, { parseHtmlFn: parseHtml, baseUrl })

// jsdom
import { transformContent } from 'feedsweep'
import { JSDOM } from 'jsdom'

await transformContent(html, {
  parseHtmlFn: (raw) => new JSDOM(`<!doctype html><body>${raw}</body>`).window.document,
  baseUrl,
})

// happy-dom
import { transformContent } from 'feedsweep'
import { Window } from 'happy-dom'

await transformContent(html, {
  parseHtmlFn: (raw) => {
    const window = new Window()
    window.document.body.innerHTML = raw
    return window.document
  },
  baseUrl,
})
```

The bundled `feedsweep/linkedom` parser bakes in two workarounds for linkedom-specific spec violations (attribute case-folding and SVG XML mode). jsdom and happy-dom do not need them.
