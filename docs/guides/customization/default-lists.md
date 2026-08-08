---
title: "Customization: Default Lists"
---

# Customize Default Lists

Feedsweep's knowledge of the feed landscape — which attributes hide lazy sources, which hosts serve tracking pixels, which selectors mark platform chrome — lives in exported default lists. Every one of them is an option on `transformContent`, and every one is importable from the `feedsweep/defaults` subpath so you can extend rather than rebuild it.

```typescript
import { defaultTrackingHosts, defaultNonContentSelectors } from 'feedsweep/defaults'
```

## Replace, Not Merge

An array option always replaces its default — nothing merges behind your back. Extending is an explicit spread:

```typescript
import { transformContent } from 'feedsweep'
import { defaultTrackingHosts } from 'feedsweep/defaults'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  trackingHosts: [...defaultTrackingHosts, 'tracker.example.com'],
})
```

The same pattern applies to every list below. Passing an empty array disables that list's behavior entirely.

## Resolver Registries

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultWidgetResolvers` | `widgetResolvers` | Embed and media recognition in `convertWidgets`. See [Widget Resolvers](/guides/customization/widget-resolvers) |
| `defaultCiteResolvers` | `citeResolvers` | Link-preview card recognition in `convertCiteCards`. See [Cite Resolvers](/guides/customization/cite-resolvers) |

## Attribute Lists

Where platforms park a real URL that belongs in `src`:

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultLazySrcAttributes` | `lazySrcAttributes` | Attributes holding a lazy-loaded image/media `src` (`data-src`, `data-lazy-src`, …) promoted by the `fixLazy*` transforms |
| `defaultLazySrcsetAttributes` | `lazySrcsetAttributes` | The `srcset` counterparts (`data-srcset`, `data-lazy-srcset`, …) |
| `defaultLazyIframeAttributes` | `lazyIframeAttributes` | Attributes holding a lazy or consent-gated iframe `src`, promoted by `fixLazyIframes` — including the attributes cookie-consent plugins rewrite the real embed URL into |
| `defaultMediaSrcAttributes` | `mediaSrcAttributes` | Attributes on non-media elements holding a playable media file URL (player widgets from Squarespace, Drupal, WordPress audio plugins, …); `convertWidgets` mints a real player from them |
| `defaultDeferredIframeSources` | `deferredIframeSources` | `{ selector, attribute }` pairs for JS-built iframes (Pym.js `data-pym-src`, @newswire/frames `data-frame-src`) materialized by `rebuildDeferredIframes` |

## Host Lists

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultTrackingHosts` | `trackingHosts` | Analytics and tracking-pixel hosts whose images `removeTrackingPixels` deletes |
| `defaultTrackingPathSegments` | `trackingPathSegments` | Path segments (`pixel`, `beacon`, `count`, `impression`) that mark a tiny image as a tracker regardless of host |
| `defaultEmojiImageHosts` | `emojiImageHosts` | Platform emoji image sets (WordPress core emoji, Twemoji CDNs, …) that `unwrapEmojiImages` replaces with the real glyph |
| `defaultAvatarImageHosts` | `avatarImageHosts` | Hosts that only ever serve author avatars (`gravatar.com`), so an avatar is never injected as an item's lead image |

## Selector Lists

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultNonContentSelectors` | `nonContentSelectors` | Platform chrome stripped by `stripNonContentElements`: subscribe forms, share clusters, ad slots, related-posts blocks, consent nags. See [Content Cleanup](/transforms/cleanup) |
| `defaultPreservedPreClasses` | `preservedPreClasses` | Class tokens marking a `<pre>` as author-chosen formatting (WordPress Verse and Preformatted blocks) that `mergeConsecutiveOneLinerPres` must not merge |

## Pipelines and Functions

| Export | Option | What it drives |
|--------|--------|----------------|
| `defaultStringTransforms` | `stringTransforms` | The pre-parse [string transforms](/transforms/string) |
| `defaultStandardDomTransforms` | `domTransforms` | The default DOM pipeline, in order. See [Custom Transforms](/guides/customization/custom-transforms) |
| `heuristicDomTransforms` | — | The opt-in [heuristic transforms](/transforms/heuristics) |
| `defaultAllDomTransforms` | — | The standard pipeline with the heuristics spliced in; what `heuristics: true` selects |
| `defaultResolveUrlFn` | `resolveUrlFn` | The default relative-URL resolver |
| `defaultHighlightFn` | `highlightFn` | The default highlighter (highlight.js). See [Code Highlighting](/guides/customization/code-highlighting) |

> [!TIP]
> Every entry in the attribute, host, and selector lists carries a source comment naming the platform or plugin that emits it. When deciding whether to trim a list, reading `src/defaults.ts` tells you exactly what each entry is for.
