---
title: "Customization: Enrichment"
---

# Customize Enrichment

Resolvers extract only what the markup carries. Enrichment fills in the rest — a thumbnail the card never named, a title only the platform's API knows — through two optional batch hooks that run after the placeholders exist. This is the one place in the pipeline where network calls belong; every resolver's `extract` stays pure.

## enrichEmbedFn

Called once with every embed placeholder that has both a provider and an id:

```typescript
type EnrichEmbedFn = (
  embeds: Array<{ provider: string; id: string }>,
) => Map<string, Partial<EmbedResolverResult>> | Promise<Map<string, Partial<EmbedResolverResult>>>
```

Return a `Map` keyed `provider:id`. Each entry's fields are written onto the matching placeholder:

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  enrichEmbedFn: async (embeds) => {
    const enriched = new Map()

    for (const { provider, id } of embeds) {
      const metadata = await fetchOEmbed(provider, id)

      if (metadata) {
        enriched.set(`${provider}:${id}`, {
          title: metadata.title,
          thumbnail: metadata.thumbnail_url,
        })
      }
    }

    return enriched
  },
})
```

The single batched call lets you deduplicate lookups, hit a cache, or fan out requests however you like — feedsweep does not care how the `Map` gets filled.

## enrichCiteFn

The cite counterpart, keyed by the cited `url` alone:

```typescript
type EnrichCiteFn = (
  cites: Array<{ provider: string; url: string }>,
) => Map<string, Partial<CiteResolverResult>> | Promise<Map<string, Partial<CiteResolverResult>>>
```

The provider is not part of the key: it names the platform the card was scraped from, not the linked page, so two cards from different platforms pointing at one URL share a single entry. It stays in the payload because an implementation may still dispatch on it.

Dates returned by `enrichCiteFn` pass through [`parseDateFn`](/guides/customization/cite-resolvers#parsedatefn) like resolver-extracted ones.

## What Enrichment Cannot Do

- **Overwrite.** Attributes already on a placeholder are never replaced — a resolver's own values always win. Enrichment only fills gaps.
- **Add fields outside the schema.** The returned metadata is mapped through the same closed field set as resolver results, so passing a whole API payload through is safe: unknown keys are dropped, and no value can become an attribute name.
- **Escape the safety passes.** Enrichment runs before `neutralizeUnsafeUrls` and `proxyAssetUrls`, so enriched URLs are still checked against the scheme floor and rewritten by your [asset proxy](/guides/customization/url-handling#assetproxyfn).

## When to Skip It

Both hooks default to unset, and the enrichment transforms no-op without them. Placeholders remain fully renderable from markup-extracted metadata alone — enrichment is for consumers that want richer previews and are willing to pay the round trips for them.
