import type { DeferredIframeSource } from '../types.js'

// Attributes that park a media file URL on a container which then builds the player with JS,
// so the media never appears for a reader. The shapes were verified in live markup 2026-08-01.
export const defaultMediaSrcAttributes = [
  'data-src', // Drupal audiofield (`.audiofield-wordpress-player`) and assorted themes.
  'data-video-src', // Discourse video placeholders, Discourse 3.2+: every forum on that version emits it.
  'data-mp4', // Beaver Builder row background video (`.fl-bg-video`).
  'data-webm', // The same widget's second source.
  'data-audiopath', // Sonaar MP3 Audio Player, ~100k WordPress installs.
  'data-qtmplayer-file', // QTM Player.
  'data-asset-url', // Squarespace audio block, Squarespace-hosted.
  'data-nectar-video-src', // Salient theme.
  'data-videolazy-id', // Tilda, page markup only.
  'data-mp4video', // Tilda Zero Block, page markup only.
  'data-pswp-video-src', // PhotoSwipe video support.
]

export const defaultLazySrcAttributes = [
  'data-src', // lazysizes / vanilla-lazyload / lozad / Drupal Blazy / a3 Lazy Load / Smush / EWWW / generic.
  'data-original', // Legacy jquery_lazyload (tuupola v1): large legacy footprint.
  'data-lazy-src', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load.
  'data-url', // Generic, observed across multiple lazy-loaders.
  'data-image', // Squarespace ImageLoader: the highest-volume real-world variant.
  'data-orig-file', // WordPress unscaled original (Jetpack media library).
  'data-large-file', // WordPress responsive variant.
  'data-medium-file', // WordPress responsive medium fallback.
  'data-thumb', // WordPress thumbnail variant.
  'data-thumb-src', // WordPress thumbnail src variant.
  'data-original-src', // Legacy lazy-loaders / pika.page CDN.
  'data-image-src', // Legacy Atlassian-style CMS.
  'data-canonical-src', // YouTube / retina-aware renderers.
  'data-img-url', // Amazon affiliate widgets / generic.
  'nitro-lazy-src', // NitroPack. Non-`data-*` prefix.
  'data-orig', // Generic original-source variant.
  'data-runner-src', // Amazon affiliate / generic.
  'fifu-data-src', // "Featured Image From URL" WP plugin.
  'data-cfsrc', // Cloudflare Mirage edge rewrite.
  'data-echo', // echo.js lazy-loader.
  'data-opt-src', // Optimole image CDN.
  'data-normal', // Future plc / generic CDN lazy-loader.
  'data-original-mos', // CMS lazy-image variant.
]

export const defaultLazySrcsetAttributes = [
  'data-srcset', // lazysizes / vanilla-lazyload / lozad / bLazy / generic.
  'data-tf-srcset', // Avada / Fusion ThemeBuilder.
  'data-lazy-srcset', // Jetpack Lazy Images / WP Rocket / BJ Lazy Load.
  'data-image-srcset', // Generic / Squarespace-style: often empty.
  'data-modal-srcset', // Modal / lightbox component.
  'data-splide-lazy-srcset', // Splide.js carousel.
  'data-alt-srcset', // Generic alternate variant.
  'fifu-data-srcset', // "Featured Image From URL" WP plugin: often empty.
  'data-thumb-srcset', // WordPress thumbnail variant: often empty.
  'data-vp-popup-img-srcset', // Visual Portfolio popup.
  'data-original-srcset', // Legacy lazy-loaders: often empty.
  'data-pswp-srcset', // PhotoSwipe lightbox.
  'data-nectar-img-srcset', // Salient theme (Nectar).
  'nitro-lazy-srcset', // NitroPack. Non-`data-*` prefix.
  'data-flickity-lazyload-srcset', // Flickity carousel.
]

// Attributes that hold a lazy/consent-gated iframe src (the real embed URL) when the
// `src` itself is empty or `about:blank`.
export const defaultLazyIframeAttributes = [
  'data-lazy-src', // Generic lazy loaders.
  'data-src', // Generic lazy loaders.
  'data-url', // Generic lazy loaders.
  'data-litespeed-src', // LiteSpeed Cache.
  'data-mce-src', // TinyMCE editor output.
  'data-orig', // Lazy-video facades (iframe id="_ytid_*") parking the embed URL with empty src.
  'data-original-src', // Generic lazy loaders.
  'data-opt-src', // Image/embed optimizers.
  // Invision Community forums defer embeds two ways: an iframe with no src at all, or one whose
  // src points at the forum's own blank interface page. FixLazyIframes treats that page as a
  // placeholder so this attribute wins in both shapes.
  'data-embed-src', // Invision Community deferred embeds.
  // Avada's privacy-embed facade (data-privacy-type is a taxonomy: YouTube, Vimeo, …), NOT a
  // cookie banner: it defers a real video the author embedded. Recovering it yields a privacy-safe
  // click-to-load placeholder. Stripping would delete the video. The visible Avada notice
  // (.fusion-privacy-placeholder) is stripped separately in defaultNonContentSelectors.
  'data-privacy-src', // Avada privacy-embed facade.
  // Cookie-consent gates (CMPs) sit on the same recover side of that line. Each plugin rewrites
  // the author's embed iframe in place, dropping src and parking the real URL in its own
  // attribute, and feed bodies carry no consent flow: the gated iframe is the whole embed, and
  // every parked URL seen in the wild is a player or viewer (YouTube, Bandcamp, Vimeo,
  // SoundCloud, Spotify, PeerTube, Google docs/maps). The tracking iframes CMPs gate live in
  // page chrome, which never reaches feed content. Real Cookie Banner parks the same URL plus
  // autoplay=1 in consent-click-original-src-_ on the same iframe, so the non-autoplay
  // attribute is listed first and wins. OneTrust, CookieFirst and Cookie Script park theirs in
  // data-src, already listed above. Gated <script> tags and the notice elements a few plugins
  // serialize next to the iframe stay stripped in defaultNonContentSelectors.
  'consent-original-src', // Consent wrappers (generic form): kept beside the suffixed form.
  'consent-original-src-_', // Real Cookie Banner.
  'consent-click-original-src-_', // Real Cookie Banner click-to-load variant: fallback only.
  'src-consent', // Borlabs Cookie.
  'data-cookieblock-src', // Cookiebot: the attribute is the only URL copy.
  'data-src-cmplz', // Complianz: src holds the plugin's placeholder video or about:blank.
  'data-consent-src', // Cookie Information / Publii Embed Consent.
  'data-wpconsent-src', // WPConsent.
  'data-suppressedsrc', // iubenda.
  'data-uc-src', // Usercentrics.
  'data-gdpr-iframesrc', // Moove GDPR Cookie Compliance.
  // EmbedPlus parks the deferred player's URL here. The plugin's facade shape is rebuilt by
  // rebuildEmbedPlusEmbeds.
  'data-ep-src', // EmbedPlus YouTube deferred player.
  'data-lazy-load', // JetElements / Woodmart / Elementor lazy video widgets.
]

export const defaultDeferredIframeSources: Array<DeferredIframeSource> = [
  // Pym.js (NPR): the established responsive-embed convention; skip already-initialized nodes.
  { selector: '[data-pym-src]:not([data-pym-auto-initialized])', attribute: 'data-pym-src' },
  // @newswire/frames (Ryan Murphy; Texas Tribune bundles it as newswireFrames).
  { selector: '[data-frame-src]', attribute: 'data-frame-src' },
  // The Drupal/CKEditor oEmbed convention parks the source url on the wrapper, so unlike the
  // two above the value is a watch page rather than a player: `youtube.com/watch`, `vimeo.com`,
  // `listen.style/p`. That is fine here, because convertWidgets asks the resolvers what the url
  // means and they mint the player from it. A host nobody resolves becomes a placeholder
  // carrying the url, which is what those feeds show today anyway.
  //
  // Scoped to a wrapper holding no player. In most feeds the iframe is already inside, and this
  // transform replaces the element it matches, so an unscoped entry would throw away a working
  // iframe along with the width and height it states.
  {
    selector: '[data-oembed-url]:not(:has(iframe, embed, object, video, audio))',
    attribute: 'data-oembed-url',
  },
  // Advanced Responsive Video Embedder's lazyload mode replaces the player with a play button
  // that holds the ready embed url and builds the iframe on click, so a reader is left with an
  // empty widget: the button carries no image either, only an inline svg. 276 corpus feeds carry
  // the attribute and 155 of them hold no YouTube player anywhere, and the destination is
  // youtube-nocookie.com or youtube.com in 275 of the 276. The class is what qualifies it, since
  // `data-iframe` is a name anyone could pick.
  { selector: '.arve-play-btn[data-iframe]', attribute: 'data-iframe' },
]
