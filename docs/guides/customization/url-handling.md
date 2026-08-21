---
title: "Customization: URL Handling"
---

# Customize URL Handling

Every URL in the output, in anchors, media sources and placeholder metadata alike, passes through a small set of options that resolve, clean, check, and proxy it. Feedsweep never invents a URL that is not present in the input; these options only decide what happens to the ones that are.

## baseUrl

The item's permalink. `resolveRelativeUrls` resolves every relative `href`, `src`, `srcset`, and `poster` against it, and same-page fragment detection treats it as the item's own page.

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  baseUrl: 'https://example.com/posts/hello-world',
})
```

Without `baseUrl`, relative URLs are left as they are.

## sameSiteUrls

Other URLs that also stand for the item's own page, typically the site's homepage and the feed URL, alongside the permalink in `baseUrl`. Some feeds, notably HTML-to-Atom bridges, absolutize in-page fragment links against one of these instead of the permalink. `shortenSamePageLinkFragments` uses this list to turn such links back into plain `#fragment` links, but only when the fragment's target id actually exists in the content, so cross-page links stay absolute.

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  baseUrl: 'https://example.com/posts/hello-world',
  sameSiteUrls: ['https://example.com', 'https://example.com/feed.xml'],
})
```

## resolveUrlFn

The function that joins a relative URL with its base. The default handles protocol-relative URLs, path traversal, and malformed bases. Replace it only if you need different resolution semantics:

```typescript
type ResolveUrlFn = (url: string, baseUrl: string | undefined) => string | undefined
```

## cleanUrlFn

A URL rewriter applied to anchor `href`s by `cleanAnchorUrls` and to the URLs read into cite and embed placeholders. This is where tracking-parameter stripping and redirect unwrapping belong:

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  cleanUrlFn: (url) => stripTrackingParams(unwrapRedirects(url)),
})
```

Feedsweep deliberately ships no URL-cleaning rules of its own: which parameters are junk and which redirectors to unwrap is consumer policy, and the same function you use elsewhere in your app can be passed straight in. When unset, URLs pass through unchanged.

The hook rewrites a URL; it cannot refuse one. Returning an empty string keeps the original, so a cleaner that cannot make sense of a URL leaves the element pointing where the feed pointed it. Refusing a URL is [`isSafeUrlFn`](/guides/security)'s job, and that one replaces it with an inert sentinel instead of removing the element.

## assetProxyFn

Rewrites media URLs to your proxy or cache, keeping the reader's requests off publisher origins:

```typescript
type AssetProxyFn = (url: string, type: 'image' | 'video' | 'audio') => string | undefined
```

`proxyAssetUrls` applies it to `src`, `srcset`, `poster`, and the URL-carrying placeholder attributes, passing the role so images and video can route to different endpoints. Returning `undefined` leaves a URL untouched.

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  assetProxyFn: (url, type) => {
    return type === 'image' ? `https://proxy.example.com/i?url=${encodeURIComponent(url)}` : undefined
  },
})
```

Each rewritten element keeps its original URL in a `data-proxied-*` attribute (`src` → `data-proxied-src`, `poster` → `data-proxied-poster`, and so on), so a consumer can always recover the source. See [Data Attributes](/output/data-attributes#proxied-originals-data-proxied).

> [!IMPORTANT]
> `assetProxyFn` must be idempotent: given an already-proxied URL it must return it unchanged (or `undefined`). The pipeline may see the same URL more than once.

## isSafeUrlFn

Optional safety policy layered on top of the always-enforced dangerous-scheme floor:

```typescript
type IsSafeUrlFn = (url: string, type: 'media' | 'link') => boolean
```

Return `false` and `neutralizeUnsafeUrls` replaces the URL with an inert sentinel. Use it for SSRF protection, scheme allowlists, or host blocklists. See [Security](/guides/security) for what the floor already covers and how the ordering guarantees work.

## Order of Application

For any given URL the passes run in a fixed order: resolve → clean → (placeholder creation and enrichment) → neutralize → proxy. Two consequences worth knowing:

- URLs added by [enrichment](/guides/customization/enrichment) are still neutralized and proxied.
- The proxy never sees a URL the safety floor rejected.
