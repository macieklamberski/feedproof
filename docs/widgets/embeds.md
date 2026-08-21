---
title: "Widgets: Embeds"
---

# Embeds

An embed is content with a platform-hosted viewer: a video player, a podcast episode, an interactive chart. The `convertWidgets` transform replaces each one with a `data-embed-*` placeholder your app renders as it sees fit, typically a thumbnail that click-loads the player, keeping third-party iframes out of the initial view.

## Fields

Attributes are written in this order, and only when a value is present:

| Field | Description |
|-------|-------------|
| `data-embed-src` | The player URL, the one field every embed placeholder carries |
| `data-embed-provider` | Provider name (`youtube`, `vimeo`, …); absent on generic iframes |
| `data-embed-id` | The provider's content id |
| `data-embed-url` | The human-facing page for the content, where the provider has one |
| `data-embed-thumbnail` | Poster image URL |
| `data-embed-width` | Width in pixels |
| `data-embed-height` | Height in pixels |
| `data-embed-ratio` | The player's shape as CSS spells it (`16/9`), when nothing measured it |
| `data-embed-title` | Content title |
| `data-embed-description` | Content description |
| `data-embed-author` | Author or channel name |
| `data-embed-avatar` | Author avatar URL |
| `data-embed-publisher` | The publication the content belongs to |
| `data-embed-date` | The content's date, as the source states it |
| `data-embed-duration` | Duration in seconds |

The placeholder is an empty `<div>`: a renderer builds the player, the facade, or the link from these attributes. See [Rendering](/output/rendering).

## Size: Dimensions or Ratio

A placeholder states how big it is in one of two ways, never both. Where something really measured the player, it carries `data-embed-width` and `data-embed-height` in pixels, or just one of them where that is all the platform states: a podcast player 200 pixels tall has no width worth naming. Where nothing measured it and only the shape is known, from a responsive wrapper or the platform's own aspect-ratio attribute, it carries `data-embed-ratio` instead.

The ratio is written from the numbers the source stated, `16/9` or `800/600` or `1.7777777777777777/1`, and is ready to assign to `style.aspectRatio` as it stands. Nothing is reduced or rounded, so the value traces back to what the markup said.

The size moves as a unit. A pass that writes any size clears the whole size slot first, so a width from one source can never end up beside a height from another, and dimensions beat a ratio when a single write brings both.

## Example

```html
<!-- Input -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" allowfullscreen></iframe>

<!-- Output -->
<div
  data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  data-embed-provider="youtube"
  data-embed-id="dQw4w9WgXcQ"
  data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  data-embed-width="560"
  data-embed-height="315"
></div>
```

The `src` is rebuilt from the extracted id, so tracking params are dropped while meaningful ones survive (a YouTube `start` offset, a Vimeo unlisted-video `h` token).

## Built-in Providers

Fifty-six platforms resolve out of the box. Each resolver reads the platform's own markup and derives what the id alone allows, a canonical page URL or a thumbnail. No network requests are ever made.

Most platforms ship their embed in more than one shape, and each shape gets its own resolver: an ordinary `<iframe>`, a `<blockquote>` the platform's script upgrades, an AMP element, a `<script>` tag beside an empty div, a Flash `<object>` in an old post. The script, blockquote, and custom-element forms are the ones that matter most, because they render nothing at all without JavaScript.

### Video

| Platform | Recognized as |
|----------|---------------|
| YouTube | Iframe, `amp-youtube`. Playlist and channel-live embeds resolve to their playlist or channel URL |
| Vimeo | Iframe; the unlisted-video token is kept |
| Dailymotion | Iframe on `dailymotion.com`, `dai.ly` |
| VideoPress | Iframe, Flash object |
| Wistia | Iframe (the JS-API facade is rebuilt into one first) |
| Brightcove | Iframe, `<video-js>` element, Flash object |
| JW Player | Iframe, script embed, `amp-jwplayer`, inline `setup()` call |
| Mediavine | `<div class="mv-video-target">` |
| TED | Iframe |
| Odysee, BitChute, Niconico | Iframe; Niconico also ships a script embed |
| Blogger | Video iframe |
| Internet Archive | Iframe, Flash object |
| Flickr | Photo and video iframe |

### Audio and Podcasts

| Platform | Recognized as |
|----------|---------------|
| SoundCloud | Player iframe, plus the share snippet's sibling links for title and author |
| Spotify | Iframe (tracks, albums, shows, episodes) |
| Apple Podcasts, Apple Music | Iframe; the provider name says which |
| Bandcamp, Mixcloud | Iframe |
| Buzzsprout | Episode iframe, WordPress shortcode script embed |
| Acast, Anchor, Audioboom, Blubrry, Captivate, Fireside, iVoox, Libsyn, Megaphone, Omny, Podbean, Podigee, Simplecast, Transistor, stand.fm | Player iframe |
| Spreaker | Iframe, player anchor |

### Social Posts

| Platform | Recognized as |
|----------|---------------|
| Twitter / X | Blockquote, iframe, `amp-twitter`, Substack's own tweet markup |
| Bluesky | Blockquote, iframe, `<bluesky-post>` element, s9e MediaEmbed wrapper |
| Instagram | Blockquote, iframe, `amp-instagram`, Substack's own markup |
| Facebook | Widget div, iframe, blockquote, XFBML, `amp-facebook` |
| TikTok | Blockquote, iframe |
| Reddit | Widget blockquote, iframe |
| Mastodon | Iframe |
| Telegram | Script embed, iframe |
| Imgur | Blockquote, iframe |
| note.com | Iframe |

A social post is always an embed, never a [cite](/widgets/cites): the post is the content, not a preview of somewhere else.

### Documents and Slides

| Platform | Recognized as |
|----------|---------------|
| Scribd | Iframe, Flash object; the honest ratio comes from `data-aspect-ratio` rather than the stock `height="500"` |
| SlideShare | Iframe, Flash object |
| Speaker Deck | Script embed, iframe |
| Issuu | Widget div, iframe |

### Interactive

| Platform | Recognized as |
|----------|---------------|
| CodePen | Widget div, iframe |
| Typeform | Widget div, iframe |
| Flourish | Widget div, iframe |
| Genially, Sketchfab | Iframe |

## Media Resolvers

Some platform markup hides a directly playable file rather than a hosted viewer. Those resolvers return a native `<video>` or `<audio>` element instead of a placeholder. See [the placeholder-or-native rule](/widgets#placeholder-or-native-element):

| Platform | Matches | Produces |
|----------|---------|----------|
| Substack | Native video/audio upload divs | `<video>`/`<audio>` pointing at the upload endpoint |
| WeChat | `<mpvoice>` narration elements | `<audio>` with the voice file URL |
| Weebly | Video wrappers with an `about:blank` iframe | `<video>` with poster, rebuilt from the wrapper's own attributes |
| Ghost | Video and audio cards | Fresh `<video>`/`<audio>` with `controls` and the card's thumbnail as poster |
| Discourse | Video placeholder divs | `<video>` with the upload URL and thumbnail poster |
| Podlove | Web Player mounts whose sibling script inlines the episode config | `<audio>` with the episode file and the show's poster |

## How Resolvers Run

Four rules govern the pass, and they explain most of what the output looks like:

- **The result shape picks the output.** A result carrying a `tag` field mints a real `<video>` or `<audio>`; any other result becomes an embed placeholder. That is the whole of the [placeholder-or-native rule](/widgets#placeholder-or-native-element): the pass reads the shape of the answer, so a resolver never states which of the two it wants.
- **Order decides overlaps.** Resolvers run in array order, and one that returns a result claims its element by replacing it, so later resolvers never see it. The more specific selector comes first: a meta-provider like Embedly wraps other providers, so it has to be read before the provider it wraps.
- **Returning nothing defers.** A resolver that does not recognize an element leaves it alone, for a later resolver or for the generic tiers below to claim.
- **Nothing in the pass touches the network.** A resolver reads the element and derives what the id allows: a canonical page URL, a thumbnail a platform composes from the id. Anything needing a round trip belongs in [enrichment](/guides/customization/enrichment), which runs later and can correct what a resolver guessed.

## Unclaimed Embeds

Anything no resolver claims still resolves, through generic tiers:

- An `<iframe>` with a resolvable `src` becomes a provider-less placeholder (just `src` and dimensions).
- An `<iframe>`, `<object>`, or `<embed>` whose URL names a media file becomes a native player instead of a frame.
- A container element parking a media-file URL in a data attribute (see [What's Built In](/guides/built-in)) gets a native player prepended, keeping the container's caption text.

> [!NOTE]
> Streaming manifests (`.m3u8`, `.mpd`) are deliberately not promoted to native players: they play natively only in Safari, so promoting one produces a broken player everywhere else. They stay as embed placeholders.

A provider that is missing belongs in the library: [open an issue or a pull request](https://github.com/macieklamberski/feedsweep/issues). To fill fields the markup does not carry, a Vimeo poster or a playlist title, see [Enrichment](/guides/customization/enrichment).
