---
title: "Transforms: Embed Recovery"
---

# Embed Recovery

A reader runs no JavaScript, and most embed plugins depend on it: they ship a facade, a thumbnail or an empty div or a custom element, and build the real player at runtime. These transforms rebuild the standard element the facade hides, early enough that the [widget pass](/widgets) treats it like any ordinary embed.

### surfaceParkedMarkup

Dissolves a lazy-loader container (`div.load-later[data-content]`) into the markup it holds percent-encoded. The plugin replaces every third-party embed with an empty div and rebuilds it on scroll, so a reader shows nothing and `stripEmptyTags` deletes the div along with the embed. The decoded payload is the publisher's original element, whatever platform it belongs to: a YouTube iframe with its player parameters, a tweet blockquote with its text and author, a TikTok quote with its caption. It runs at the head of the pipeline, so every pass below sees ordinary markup.

**Before**

```html
<div class="load-later" data-content="%3Ciframe%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ%22%3E%3C%2Fiframe%3E"></div>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### surfaceTemplateEmbeds

Hoists embed markup trapped inside a `<template>` into the document. Lazy-load video plugins park the real iframe (or a complete `<video>`, as Shopify's deferred media does) in a template and show only a thumbnail. Templates holding no embed are JS scaffolding and are left alone.

**Before**

```html
<template><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></template>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### surfaceNoscriptEmbeds

Hoists a video iframe out of its `<noscript>` fallback. Lazy-load plugins wrap the original iframe in `<noscript>`, which readers hide and sanitizers strip. Only iframes claimed by a [widget resolver](/widgets/embeds) are surfaced, since `<noscript><iframe>` is also how tag managers and ad networks ship fallbacks, and those must stay buried.

**Before**

```html
<noscript><iframe src="https://player.vimeo.com/video/76979871"></iframe></noscript>
```

**After**

```html
<iframe src="https://player.vimeo.com/video/76979871"></iframe>
```

### rebuildEmbedPlusEmbeds

Rebuilds the iframe from an Embed Plus for YouTube facade, which holds the ready embed URL in `data-facadesrc`. The facade's own poster image rides along as `data-thumbnail`, so the placeholder keeps the publisher's high-resolution still.

**Before**

```html
<div class="epyt-facade" data-facadesrc="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### rebuildLiteVideoEmbeds

Rebuilds the iframe from a `lite-youtube` or `lite-vimeo` web component, which holds the video id in a `videoid` attribute. The `start` offset and `videotitle` carry over.

**Before**

```html
<lite-youtube videoid="dQw4w9WgXcQ" start="42"></lite-youtube>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=42"></iframe>
```

### rebuildLyteEmbeds

Rebuilds the iframe from a WP YouTube Lyte facade, which encodes the video id in its `id` attribute (`WYL_{id}` or `lyte_{id}`).

**Before**

```html
<div id="WYL_dQw4w9WgXcQ"></div>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### rebuildRocketYoutubePreviews

Rebuilds the iframe from a WP Rocket YouTube preview div, which holds the embed URL in `data-src` and the original query string in `data-query`.

**Before**

```html
<div class="rll-youtube-player" data-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></div>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### rebuildVideoJsEmbeds

Rebuilds a native `<video>` from a `<video-js>` custom element, which renders nothing until the Video.js script upgrades it. The file comes from a `<source>` child or from the `sources` array of the element's `data-setup` JSON, and the poster carries over. Only a file the browser can play itself qualifies: a stream manifest needs the player's JavaScript to stitch its segments. An element naming no file at all, a Brightcove player identified by account and video id for instance, is left to that platform's own resolver in the [widget pass](/widgets).

**Before**

```html
<video-js data-setup='{"sources":[{"src":"https://example.com/clip.mp4"}]}' poster="https://example.com/still.jpg"></video-js>
```

**After**

```html
<video src="https://example.com/clip.mp4" controls poster="https://example.com/still.jpg"></video>
```

### rebuildWistiaEmbeds

Rebuilds the iframe from a Wistia JS-API embed, a `<div class="wistia_embed wistia_async_{id}">` with no iframe. The responsive padding wrappers around it are replaced along with it.

**Before**

```html
<div class="wistia_embed wistia_async_zyl6xrmj10"></div>
```

**After**

```html
<iframe src="https://fast.wistia.net/embed/iframe/zyl6xrmj10"></iframe>
```

### rebuildLazyLoadForVideos

Rebuilds the iframe from a Lazy Load for Videos facade, an anchor holding the watch URL in `data-video-uri` (or its visible `href`). The URL is mapped to the platform's embed form through the same resolvers the widget pass uses, so details like Vimeo's unlisted-video hash survive.

**Before**

```html
<a class="preview-lazyload" data-video-uri="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Watch</a>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### rebuildLazyYtEmbeds

Rebuilds the iframe from a jQuery lazyYT facade, which carries the video id in `data-youtube-id` and its pixel size in `data-width` / `data-height`.

**Before**

```html
<div class="lazyYT" data-youtube-id="dQw4w9WgXcQ"></div>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

### rebuildElementorVideoEmbeds

Rebuilds the iframe an Elementor video widget defers to JS. The widget's `data-settings` JSON names the platform and the watch URL; YouTube, Vimeo, Dailymotion, and VideoPress are recovered. The self-hosted mode already renders server-side as a real `<video>` and is skipped.

**Before**

```html
<div class="elementor-widget-video" data-settings='{"video_type":"youtube","youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'><div class="elementor-video"></div></div>
```

**After**

```html
<div class="elementor-widget-video"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></div>
```

### rebuildEmbedlyEmbeds

Unwraps an Embedly media widget to the third-party iframe it wraps. The real embed URL and its poster both live in the wrapper's query string; the poster carries over as `data-thumbnail`, which the widget pass prefers over a resolver's URL-derived guess.

**Before**

```html
<iframe src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ&image=https%3A%2F%2Fexample.com%2Fposter.jpg"></iframe>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-thumbnail="https://example.com/poster.jpg"></iframe>
```

### rebuildDeferredIframes

Materializes an iframe whose URL is parked in a `<div>` attribute by an embed convention that builds the iframe at runtime: Pym.js (`data-pym-src`), @newswire/frames (`data-frame-src`), and the Drupal/CKEditor oEmbed convention (`data-oembed-url`). The oEmbed wrapper parks a watch page rather than a player URL, which is fine here, because the widget pass asks the resolvers what the URL means and they mint the player from it.

**Before**

```html
<div data-pym-src="https://example.com/interactive/chart.html"></div>
```

**After**

```html
<iframe src="https://example.com/interactive/chart.html"></iframe>
```

### fixLazyIframes

Promotes a lazy or consent-gated iframe URL from a `data-*` attribute into `src`, when the existing `src` is empty, `about:blank`, or a known placeholder page. This is also how consent-gated embeds are recovered: GDPR consent plugins rewrite the author's iframe to park its URL in an attribute like `consent-original-src-_` or `data-src-cmplz` until the visitor accepts cookies. A feed body carries no consent flow: the gated iframe is the author's chosen embed, so it is restored, while the plugin's "please accept cookies" notice is [stripped as chrome](/transforms/cleanup). The attributes it reads cover the lazy loaders and the consent plugins alike, and are [built in](/guides/built-in).

**Before**

```html
<iframe src="about:blank" data-consent-src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
```

**After**

```html
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-consent-src="…"></iframe>
```

### linkifyGistEmbeds

Replaces a GitHub Gist script embed, which renders nothing without JS, with a link to the gist page, so the content is at least reachable.

**Before**

```html
<script src="https://gist.github.com/user/abc123.js"></script>
```

**After**

```html
<a href="https://gist.github.com/user/abc123">https://gist.github.com/user/abc123</a>
```

### convertDatawrapperEmbeds

Converts Datawrapper chart embeds, in their iframe, script, and link forms, into a static `<img>` of the chart's published PNG render, wrapped in a link to the interactive version. The static render is the platform's own declared fallback, derivable from the chart id alone, and it shows the chart immediately instead of loading a third-party frame. The image flows to the media transforms downstream like any other.

**Before**

```html
<iframe src="https://datawrapper.dwcdn.net/abc12/3/" title="Chart title"></iframe>
```

**After**

```html
<a href="https://datawrapper.dwcdn.net/abc12/"><img src="https://datawrapper.dwcdn.net/abc12/full.png" alt="Chart title"></a>
```

### convertGiphyEmbeds

Converts a Giphy iframe into the gif itself, linked to its Giphy page. Every Giphy gif is a plain file derivable from the id, and a gif animates in an `<img>` with no script at all, so the frame costs a third-party request and hides the image from the dimension, proxy, and enclosure passes that treat every other image in the document.

**Before**

```html
<iframe src="https://giphy.com/embed/l0HlQoLBhTNMxHkaA"></iframe>
```

**After**

```html
<a href="https://giphy.com/gifs/l0HlQoLBhTNMxHkaA"><img src="https://media.giphy.com/media/l0HlQoLBhTNMxHkaA/giphy.gif"></a>
```

### convertNoteEmbeds

Converts note.com's embed figures, which are empty `<figure embedded-service data-src>` elements only the platform's web client hydrates. Media services (YouTube, Spotify, oEmbed) become plain iframes for the widget pass to classify; an own-post embed carries nothing but the post URL and becomes a plain link. External-article figures are read by the [cite pass](/widgets/cites) instead and stay untouched here.

**Before**

```html
<figure embedded-service="youtube" data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></figure>
```

**After**

```html
<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>
```

> [!NOTE]
> Rebuilt iframes are not the final output. The [widget pass](/widgets) runs later and converts each recognized iframe into a `data-embed-*` placeholder. The rebuild transforms exist so it has a real iframe to read.
