---
title: "Transforms: Links and URLs"
---

# Links and URLs

Feed URLs arrive relative, wrapped in redirectors, split by word breaks, or plain unsafe. These transforms make every URL absolute, clean, and inert where it must be, and turn bare URLs and timestamps into usable affordances.

### resolveRelativeUrls

Resolves relative URLs against the `baseUrl` option: anchor `href`, `src` on any element, `video` posters, `srcset` candidates, `object` data, and SVG `image` hrefs. Fragment-only hrefs (`#section`) stay untouched so in-article anchors keep scrolling locally. Does nothing when `baseUrl` is not set.

**Before**

```html
<img src="/images/chart.png">
```

**After**

```html
<img src="https://example.com/images/chart.png">
```

Resolution itself goes through the `resolveUrlFn` option; see [URL Handling](/guides/customization/url-handling).

### cleanAnchorUrls

Passes every anchor `href` through the `cleanUrlFn` option. Unwrapping redirect wrappers and stripping tracking params is delegated entirely to that injected function; feedsweep ships no URL-cleaning rules of its own. Does nothing when `cleanUrlFn` is not set.

**Before**

```html
<a href="https://example.com/post?utm_source=rss">Post</a>
```

**After**

```html
<a href="https://example.com/post">Post</a>
```

### shortenSamePageLinkFragments

Rewrites a fragment link on the item's own page back to its bare `#fragment` form. Once `resolveRelativeUrls` has absolutized everything, a heading permalink like `https://example.com/post#setup` reads as a cross-page link and navigates away instead of scrolling.

**Before**

```html
<a href="https://example.com/post#setup">Setup</a>
```

**After**

```html
<a href="#setup">Setup</a>
```

A link on the `baseUrl` page is always shortened. Links on the item's other self pages, listed in the `sameSiteUrls` option and typically the site URL and feed URL, are shortened only when the fragment's target actually exists in the content, so genuine links to other pages of the same site stay absolute.

### normalizeAnchoredHeadings

Collapses the many heading-permalink shapes static-site generators emit, trailing `#` and `¶` glyphs, link-icon anchors, `headerlink`/`header-anchor`/`hash-link` classes and whole-heading links, into one canonical form: plain heading text plus a single empty, self-referential anchor.

**Before**

```html
<h2 id="setup">Setup<a class="headerlink" href="#setup">¶</a></h2>
```

**After**

```html
<h2><a id="setup" href="#setup"></a>Setup</h2>
```

Footnote references, accordion toggles, and anchors with real link text are recognized and left alone.

### stripDeadAnchors

Unwraps anchors whose `href` navigates nowhere: empty, a lone `#`, or a `javascript:` pseudo-protocol left over from an interactive widget. The text stays visible, and any URL inside it becomes eligible for `linkifyUrls`. Anchors carrying `id` or `name` are kept: they are navigation targets other links point to.

**Before**

```html
<p><a href="#">Read https://example.com/post</a></p>
```

**After**

```html
<p>Read <a href="https://example.com/post">https://example.com/post</a></p>
```

### stripWordBreaks

Removes every `<wbr>` and merges the surrounding text. Email-oriented feeds split long URLs with word-break hints, which leaves `linkifyUrls` seeing only the stub before the break. The reader controls its own text wrapping, so the hint costs nothing to drop.

**Before**

```html
<p>https://youtu.be/<wbr>dQw4w9WgXcQ</p>
```

**After**

```html
<p>https://youtu.be/dQw4w9WgXcQ</p>
```

### linkifyUrls

Wraps bare `http(s)` URLs in text with `<a>` tags. Text inside `<a>`, `<pre>`, `<code>`, `<kbd>`, `<samp>`, and `<var>` is skipped. Each minted link is passed through `cleanUrlFn`, and when cleaning changes the URL, the visible text shows the cleaned form, so a visible URL never points somewhere else.

**Before**

```html
<p>Watch it at https://example.com/talk</p>
```

**After**

```html
<p>Watch it at <a href="https://example.com/talk">https://example.com/talk</a></p>
```

### markTimestamps

Wraps line-leading or line-ending `MM:SS` / `HH:MM:SS` timestamps in `<span data-timestamp="seconds">`, so a podcast or video reader can make chapter lists clickable. A `12:30` in the middle of prose is not matched.

**Before**

```html
<p>03:45 The interview begins</p>
```

**After**

```html
<p><span data-timestamp="225">03:45</span> The interview begins</p>
```

### neutralizeUnsafeUrls

Replaces unsafe URLs with an inert sentinel while keeping the element: `#unsafe-link` for link-role attributes, `about:blank` for media. Two layers apply:

- **The dangerous-scheme floor, always enforced**: `javascript:`, `vbscript:`, and `data:text/html` everywhere, plus `data:image/svg+xml` for links (an SVG data URL executes when navigated to, but is inert as an image source). Leading control characters and whitespace are stripped before the scheme is read, so `java\tscript:` is caught the way a browser would read it.
- **Consumer policy**, when the `isSafeUrlFn` option is set: SSRF rules, host allowlists, whatever the caller decides. See [Security](/guides/security).

Covered attributes include `href`, `src`, `srcset`, `poster`, `xlink:href`, and every URL-carrying `data-embed-*` / `data-cite-*` placeholder field.

**Before**

```html
<a href="javascript:alert(1)">Click</a>
```

**After**

```html
<a href="#unsafe-link">Click</a>
```

### proxyAssetUrls

Rewrites media URLs through the `assetProxyFn` option: images, video, audio, `source` and `track` elements, SVG images, and placeholder thumbnail/icon/avatar fields. The original URL is preserved on the element as `data-proxied-<name>` (`src` → `data-proxied-src`), so a reader can fall back when the proxied URL fails. Does nothing when `assetProxyFn` is not set.

**Before**

```html
<img src="https://example.com/photo.jpg">
```

**After**

```html
<img src="https://proxy.example.net/aHR0cHM6...?type=image" data-proxied-src="https://example.com/photo.jpg">
```

> [!IMPORTANT]
> `assetProxyFn` must be idempotent: given an already-proxied URL, it must return it unchanged. The transform relies on that to keep the preserved original intact across repeat runs.

Ordering is a guarantee, not an accident: `neutralizeUnsafeUrls` runs after enrichment fills placeholder metadata (so enriched URLs are covered) and before `proxyAssetUrls` (so the proxy never sees an unsafe URL).
