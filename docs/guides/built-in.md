---
title: "Guides: What's Built In"
---

# What's Built In

Feedsweep's knowledge of the feed landscape lives in the library, not in your configuration: which attributes hide a lazy source, which hosts serve tracking pixels, which selectors mark platform chrome, which markup names a YouTube video. None of it is an option on `transformContent`.

That is a deliberate line. Every entry in these lists was measured against a corpus of real feeds before it was added, and each one carries a source comment naming the platform or plugin that emits it and how many feeds carry it. A list a caller can replace is a list that drifts from the measurement behind it. If feedsweep misses a platform or an attribute you see in the wild, the fix belongs in the library: [open an issue or a pull request](https://github.com/macieklamberski/feedsweep/issues).

What you do control is the pipeline itself, plus the hooks around it: [`stringTransforms` and `domTransforms`](/guides/customization/custom-transforms), [`cleanUrlFn`, `assetProxyFn`, and `isSafeUrlFn`](/guides/customization/url-handling), [`highlightFn`](/guides/customization/code-highlighting), and the [enrichment hooks](/guides/customization/enrichment).

## Resolver Registries

| Export | What it drives |
|--------|----------------|
| `defaultWidgetResolvers` | Embed and media recognition in `convertWidgets`. See [Embeds](/widgets/embeds) |
| `defaultCiteResolvers` | Link-preview card recognition in `convertCiteCards`. See [Cites](/widgets/cites) |

## Attribute Lists

Where platforms park a real URL that belongs in `src`:

| Export | What it drives |
|--------|----------------|
| `defaultLazySrcAttributes` | Attributes holding a lazy-loaded image or media `src` (`data-src`, `data-lazy-src`, …) promoted by the `fixLazy*` transforms |
| `defaultLazySrcsetAttributes` | The `srcset` counterparts (`data-srcset`, `data-lazy-srcset`, …) |
| `defaultLazyIframeAttributes` | Attributes holding a lazy or consent-gated iframe `src`, promoted by `fixLazyIframes`, including the ones cookie-consent plugins rewrite the real embed URL into |
| `defaultMediaSrcAttributes` | Attributes on non-media elements holding a playable media file URL (player widgets from Squarespace, Drupal, WordPress audio plugins, …); `convertWidgets` mints a real player from them |
| `defaultDeferredIframeSources` | `{ selector, attribute }` pairs for JS-built iframes (Pym.js `data-pym-src`, @newswire/frames `data-frame-src`, the Drupal/CKEditor `data-oembed-url` convention) materialized by `rebuildDeferredIframes` |

## Host Lists

| Export | What it drives |
|--------|----------------|
| `defaultTrackingHosts` | Analytics and tracking-pixel hosts whose images `removeTrackingPixels` deletes |
| `defaultTrackingPathSegments` | Path segments (`pixel`, `beacon`, `count`, `impression`) that mark a tiny image as a tracker regardless of host |
| `defaultEmojiImageHosts` | Platform emoji image sets (WordPress core emoji, Twemoji CDNs, …) that `unwrapEmojiImages` replaces with the real glyph |
| `defaultAvatarImageHosts` | Hosts that only ever serve author avatars (`gravatar.com`), so an avatar is never injected as an item's lead image |

## Selector Lists

| Export | What it drives |
|--------|----------------|
| `defaultNonContentSelectors` | Platform chrome stripped by `stripNonContentElements`: subscribe forms, share clusters, ad slots, related-posts blocks, consent nags. See [Content Cleanup](/transforms/cleanup) |
| `defaultPreservedPreClasses` | Class tokens marking a `<pre>` as author-chosen formatting (WordPress Verse and Preformatted blocks) that `mergeConsecutiveOneLinerPres` must not merge |

## Pipelines and Functions

These are the ones a caller can still swap, through the options named beside them.

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultStringTransforms` | `stringTransforms` | The pre-parse [string transforms](/transforms/string) |
| `defaultStandardDomTransforms` | `domTransforms` | The default DOM pipeline, in order. See [Custom Transforms](/guides/customization/custom-transforms) |
| `heuristicDomTransforms` | none | The opt-in [heuristic transforms](/transforms/heuristics) |
| `defaultAllDomTransforms` | none | The standard pipeline with the heuristics spliced in; what `heuristics: true` selects |
| `defaultResolveUrlFn` | `resolveUrlFn` | The default relative-URL resolver |
| `defaultHighlightFn` | `highlightFn` | The default highlighter, highlight.js. See [Code Highlighting](/guides/customization/code-highlighting) |

Every export above is importable from the `feedsweep/defaults` subpath, so a custom pipeline can be built around the default one:

```typescript
import { transformContent } from 'feedsweep'
import { defaultStandardDomTransforms } from 'feedsweep/defaults'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  domTransforms: [...defaultStandardDomTransforms, myTransform],
})
```

> [!TIP]
> Reading `src/defaults.ts` tells you exactly what each entry is for. The comments carry the plugin name, the markup shape, and the corpus prevalence that justified adding it.
