---
title: "Guides: Security"
---

# Security

Feed HTML is untrusted input. Feedsweep enforces a floor of URL safety and a set of privacy measures on everything that passes through it. It is not a sanitizer though, and the boundary between the two matters.

## Not a Sanitizer

Feedsweep does not enforce a tag or attribute allowlist, does not strip `<script>` elements, and does not remove event-handler attributes. Its job is making feed content display well; deciding what markup is allowed to reach your users is a separate concern with its own tooling.

> [!IMPORTANT]
> Keep an HTML sanitizer in your pipeline. Run it after `transformContent` so it sees the final markup, and configure it to preserve the `data-*` attributes described in [Data Attributes](/output/data-attributes), or it will strip the placeholder metadata your renderer needs.

## The Dangerous-Scheme Floor

The `neutralizeUnsafeUrls` transform always runs and always enforces one rule: a URL whose scheme executes or renders markup is replaced with an inert sentinel. This floor holds regardless of any option you pass.

- `javascript:`, `vbscript:`, and `data:text/html` are rejected everywhere.
- `data:image/svg+xml` is rejected for links only: an SVG data URL executes when navigated to, but is inert as an image source.
- Before the check, ASCII whitespace and C0 control characters are stripped from the URL, because browsers do the same before reading the scheme: `java\tscript:` and `\x01javascript:` both run as `javascript:` in a browser, so both are caught.

An unsafe URL is replaced, not removed: links get `#unsafe-link`, media sources get `about:blank`. The element stays in place, so surrounding content is untouched.

The check covers every URL position Feedsweep knows about: `href` and `xlink:href`, `src` on media and frames, `poster`, `object`'s `data`, `formaction`, and the placeholder attributes `data-embed-src`, `data-embed-url`, `data-embed-thumbnail`, `data-embed-avatar`, `data-cite-url`, `data-cite-icon`, and `data-cite-thumbnail`. In a `srcset`, unsafe candidates are dropped and the safe ones kept; the sentinel only appears when every candidate is unsafe.

## Consumer Policy: isSafeUrlFn

The floor blocks what is dangerous everywhere. Your deployment usually has stricter rules: private-network hosts behind an asset proxy, protocol allowlists, blocked origins. Pass `isSafeUrlFn` to layer that policy on top; any URL it rejects is neutralized with the same sentinels.

The function receives the URL and its role, `'media'` for anything that loads (images, video, iframes, posters, thumbnails) or `'link'` for anything that navigates, so a policy can allow an origin as a link target while refusing to load assets from it.

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent(content, {
  parseHtmlFn: parseHtml,
  isSafeUrlFn: (url, role) => {
    const { protocol, hostname } = new URL(url)

    if (protocol !== 'https:' && protocol !== 'http:') {
      return false
    }

    // Keep the asset proxy from being pointed at internal services.
    return role === 'link' || !hostname.endsWith('.internal')
  },
})
```

`isSafeUrlFn` must not throw: return `false` for anything you cannot judge.

## Ordering Guarantees

Two orderings in the default pipeline are load-bearing for safety:

- Neutralization runs **after** [enrichment](/guides/customization/enrichment), so URLs added by your `enrichEmbedFn` or `enrichCiteFn` go through the same floor and policy as URLs from the feed.
- Neutralization runs **before** [asset proxying](/guides/customization/url-handling), so your `assetProxyFn` never sees an unsafe URL.

If you compose a custom `domTransforms` array, keep `neutralizeUnsafeUrls` after anything that writes URLs and before `proxyAssetUrls`.

## Privacy

Beyond URL safety, the default pipeline removes the common ways feed content phones home:

- **Tracking pixels.** `removeTrackingPixels` drops 1×1 and invisible images, plus any image from one of the ~50 known tracking hosts it carries or with a path segment like `pixel` or `beacon`.
- **Tracking params and redirect wrappers.** The `cleanUrlFn` hook cleans every anchor and placeholder URL; supply your URL cleaner of choice and Feedsweep applies it in all the right places. See [URL Handling](/guides/customization/url-handling).
- **Third-party iframes become placeholders.** An embedded player loads nothing until your renderer decides to load it, so reading an item never contacts the embed's origin by default. See [Widgets](/widgets).
- **Asset proxying.** `assetProxyFn` rewrites image, video, and audio URLs through your proxy, keeping reader IPs off publisher origins. The original URL is preserved in a `data-proxied-*` attribute for fallback and dedup.
- **Oversized inline payloads.** `stripOversizedBase64Sources` caps base64 `data:` sources before parsing, so a multi-megabyte inline blob cannot bloat the stored content.

## Next Steps

- **[URL Handling](/guides/customization/url-handling).** Wiring `cleanUrlFn`, `assetProxyFn`, and `isSafeUrlFn` together.
- **[Data Attributes](/output/data-attributes).** The attributes a sanitizer allowlist needs to preserve.
