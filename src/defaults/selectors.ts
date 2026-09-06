export const defaultNonContentSelectors = [
  // Subscribe and newsletter signup forms.
  '[data-component-name="SubscribeWidget"]', // Substack inline subscribe widget.
  '.subscription-widget-wrap-editor', // Substack paywall / subscribe CTA.
  // The same subscribe form as the wrap below, arriving as Substack's other snippet. The path is
  // anchored so a post embed (`/embed/post/{id}`) is not caught by it.
  'iframe[src*=".substack.com/"][src$="/embed"]',
  '.wp-block-jetpack-subscriptions', // Jetpack Gutenberg subscribe block.
  '.kg-signup-card', // Ghost (Koenig) signup card.
  '.mc4wp-form', // Mailchimp for WordPress plugin form.
  '.formkit-form', // ConvertKit / Kit subscribe form.
  'iframe[src*="embeds.beehiiv.com"]', // Beehiiv embed iframe.
  '.jetpack_subscription_widget', // Jetpack legacy sidebar subscribe widget.
  'form[action*="buttondown.email"]', // Buttondown embed-subscribe form; mentions of the host are nearly all plain links.
  '.sqs-block-newsletter', // Squarespace newsletter block.
  // Bloom (Elegant Themes) optin. The bare `.et_bloom` class does not exist on any element in
  // the wild: the tokens are `et_bloom_bottom_trigger`, `et_bloom_fields` and so on, and a
  // class selector matches whole tokens, so it stripped nothing. Matched on the prefix instead.
  // Most of what that reaches is the empty trigger span, which stripEmptyTags already removed;
  // the few feeds carrying the popup form are what this actually gains.
  '[class*="et_bloom"]',
  '.wpforms-container', // WPForms.
  '[class*="tve-leads"]', // Thrive Leads optin.

  // Ad slots.
  '.adsbygoogle', // Google AdSense ad slot.
  'div[id^="div-gpt-ad"]', // Google Ad Manager (GPT) ad slot.
  '.adthrive-ad', // AdThrive (Raptive) ad slot.
  'amp-ad', // AMP ad slot.
  'amp-auto-ads', // AMP auto-ads placement marker.
  'amp-sticky-ad', // AMP sticky bottom ad bar.
  'amp-sticky-ad-top-padding', // AMP runtime spacer holding room for the sticky ad bar.

  // Tracking beacons, which render nothing at all.
  'amp-pixel', // AMP tracking pixel.
  'amp-analytics', // AMP analytics element, a JSON config for its runtime.

  // Share and call-to-action button clusters.
  '.captioned-button-wrap', // Substack caption + CTA button (Share/Subscribe/Comment).
  // Substack's ButtonCreateButton, its CTA button outside a captioned wrap. The component wraps
  // author-authored buttons too (donation links, "Read <post title>"), and Elementor emits the
  // same button-wrapper class, so the platform action in the href is what is matched rather than
  // the component or the class.
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/subscribe"])',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="/comments"])',
  '[data-component-name="ButtonCreateButton"]:has(> a[href*="action=share"])',
  '[class*="social-share"]', // Generic social-share button cluster.
  '[class*="share-buttons"]', // Generic social-share button cluster.
  '.sharethis-inline-share-buttons', // ShareThis inline share buttons.
  '.sharedaddy', // Jetpack Sharedaddy share buttons.
  '.feedflare', // FeedBurner share footer ("Share on X / Email this").
  '.addtoany_share_save_container', // AddToAny share buttons (WordPress).
  // The AddToAny anchor itself. Usually empty, where stripEmptyTags already removed it. This is
  // for the variant that carries an image or text and survives as a "Share" button.
  'a.addtoany_share_save',
  // Survives as a live "Tweet" link in the output, usually with no other non-content selector
  // matching anywhere.
  'a.twitter-share-button',
  // Drupal Easy Social. The widget is chrome, but the pipeline cannot tell, so its Facebook
  // Like iframe becomes an embed placeholder card and the chrome is promoted to content.
  'div.easy_social_box',
  // A per-post like button with its count, which a community activity feed writes under every
  // update. The button renders nothing in a reader and the count survives as a stray digit.
  '.vm-like-button',
  // The Like button pasted on its own, a 25 pixel iframe that would otherwise reach the reader
  // as a click-to-play placeholder for a button. Matched as two substrings for the same reason
  // as the plugins below: a generator can write the Graph API version between the host and the
  // file, and those urls still serve.
  'iframe[src*="facebook.com"][src*="/plugins/like.php"]',
  // The rest of the plugin namespace that is chrome rather than a post: the Page box in both its
  // spellings, and the Share button. The resolver already refuses each of these as an embed, and
  // refusing leaves them to the generic fallback, which draws a card for a follow widget. The two
  // plugins that do carry content, `post.php` and `video.php`, are named nowhere here.
  //
  // The host and the file are matched separately because a generator can write the Graph API
  // version between them (`facebook.com/v2.3/plugins/page.php`), which one substring would miss.
  'iframe[src*="facebook.com"][src*="/plugins/page.php"]',
  'iframe[src*="facebook.com"][src*="/plugins/likebox.php"]',
  'iframe[src*="facebook.com"][src*="/plugins/share_button.php"]',
  '.a2a_kit', // AddToAny share icons (higher-prevalence marker than the wrapper).
  '[class*="addthis_"]', // AddThis share toolbox.
  '.shareaholic-canvas', // Shareaholic share/related widget.
  'amp-social-share', // AMP share button.

  // Theme and plugin social clusters, each one its own vendor namespace rather than a generic
  // class the two [class*=] entries above already reach.
  '.wp-block-social-links', // WordPress core social-links block (follow icons).
  '.et_pb_social_media_follow', // Divi social-media-follow module.
  '.elementor-social-icons-wrapper', // Elementor social-icons widget (follow icons).
  '.rrssb-buttons', // Ridiculously Responsive Social Sharing Buttons.
  '.simplesocialbuttons', // SimpleSocialButtons share bar.
  // Synved Social Share renders no wrapper, so the anchors are siblings of the post's own
  // paragraphs and the button itself is the only thing there is to match.
  'a.synved-social-button', // Synved Social Share buttons.
  // GemPages (Shopify page builder) social-share module. The wrapper's class is only
  // "module-wrap", so the [class*=] entries above never reach it.
  '[data-key="social-share"]',
  '.av-share-box', // Enfold theme "Share this entry" box.
  // Elementor names the widget only through modifier classes (elementor-share-buttons--view-icon
  // and siblings), so there is no bare class to match.
  '[class*="elementor-share-buttons"]', // Elementor share-buttons widget.
  '[class*="heateor_sss"]', // Sassy Social Share sharing container.
  '.mashsb-container', // MashShare share bar.
  // Simple Share Buttons Adder writes the wrapper as `ssba ssbp-wrap`; there is no `ssba-wrap`
  // class despite the plugin's name.
  '.ssbp-wrap', // Simple Share Buttons Adder share bar.
  '.swp_social_panel', // Social Warfare share panel.

  // Related-posts widgets.
  '.yarpp-related', // YARPP related-posts widget (WordPress).
  '.jp-relatedposts', // Jetpack related-posts carousel.
  '.crp_related', // Contextual Related Posts WordPress plugin.
  '.zergnet-widget', // ZergNet content-recommendation widget.

  // Author bio blocks.
  '.wp-block-post-author', // WordPress Gutenberg author bio block.
  '.saboxplugin-wrap', // Simple Author Box WordPress plugin.

  // Excerpt-truncation links. Anchor-scoped so wrappers holding real content survive.
  'a[class*="read-more"]', // "Read more" excerpt-truncation links.
  'a[class*="continue-reading"]', // "Continue reading" excerpt-truncation links.

  // Comment-system embeds (JS mounts that render nothing without their loader script).
  '.fb-comments', // Facebook Comments.

  // Breadcrumb trails, carried into the item by themes that put the page hero into the content
  // field. Gated on a navigation element or a plugin class, because the bare word also names
  // recipes and articles about breadcrumbs.
  'nav.breadcrumb', // Theme breadcrumb trail.
  'nav.breadcrumbs', // Theme breadcrumb trail, plural spelling.
  'nav[aria-label^="breadcrumb" i]', // ARIA-labelled breadcrumb trail, singular or plural.
  '[role="navigation"][aria-label^="breadcrumb" i]', // The same trail on a div with a navigation role.
  '.aioseo-breadcrumbs', // All in One SEO breadcrumb trail.

  // Reading-time badges, which plugins write into the post body so they ship in the feed as a
  // stray "Reading Time: 6 minutes" line above the article.
  '.rt-reading-time', // Reading Time WP badge.
  '.yoast-reading-time__wrapper', // Yoast SEO estimated-reading-time block.
  '.booster-read-block', // Booster read-time block.
  '.bsf-rt-reading-time', // Ultimate Addons for Elementor reading-time shortcode.
  '.reading-time-article', // Drupal theme badge, the article copy.
  '.reading-time-teaser', // Drupal theme badge, the teaser copy emitted beside it.

  // Print / PDF buttons.
  '.printfriendly', // PrintFriendly print/PDF button.
  '.pf-button', // PrintFriendly button.

  // Platform UI chrome and non-rendered scaffolding.
  '.image-link-expand', // Substack restack/zoom buttons next to images.
  'drupal-render-placeholder', // Drupal lazy-render markers for comments/forms/flag widgets.
  '.mcnPreviewText', // Mailchimp hidden email preheader text.
  '.tmblr-alt-text-helper', // Tumblr badge rendering a stray "ALT" beside an image that keeps its own alt attribute.
  'img[src*="steamcommunity.com"][src*="placeholder"]', // Steam news static poster gif shown before its JS swaps in the YouTube iframe.

  // GDPR/consent-gated embeds are recovered, not stripped: each CMP parks the author's embed
  // URL on the iframe itself, so fixLazyIframes promotes it back into src (see the CMP block in
  // defaultLazyIframeAttributes). What stays stripped here is the part that renders as chrome.
  // Real Cookie Banner also gates <script> tags (adsbygoogle, Vimeo player.js). Script-scoped so
  // the gated scripts still go while the gated iframes are recovered.
  'script[consent-original-src-_]', // Real Cookie Banner gated scripts.
  '.cookieconsent-optout-marketing', // Cookiebot "please accept marketing cookies" notice beside the gated iframe.
  '.pec-overlay', // Publii Embed Consent click-to-accept overlay beside the gated iframe.
  // OneTrust video fallback: thumbnail plus "enable cookies to view this content" text and a
  // settings link, serialized as a sibling of the gated iframe inside the wrapper.
  '.onetrust-css-video-wrapper .fallback-container', // OneTrust video fallback notice.
  // Avada's leftover "For privacy reasons … please accept" notice. The gated iframe itself is
  // recovered via data-privacy-src (a lazy attribute); only this consent nag is dead chrome.
  '.fusion-privacy-placeholder', // Avada privacy-embed notice.
  // AMP's own gate follows the same split. The element holds the config and the prompt UI and
  // nothing else, since whatever it gates carries data-block-on-consent and sits elsewhere in
  // the document, so removing it takes the nag and leaves the gated element to be recovered.
  'amp-consent', // AMP consent gate.
  // s9e MediaEmbed (forum software) wraps its player in a sizing span. Where the feed generator
  // stripped the iframe out of it, what survives is the wrapper around the literal word
  // "iframe", which renders as that word in the middle of the post. Scoped to a wrapper holding
  // no player, so the ones whose iframe survived are untouched. The video id is nowhere in the
  // markup, so there is nothing to recover here, only chrome to remove.
  'span[data-s9e-mediaembed]:not(:has(iframe, embed, object, video, audio))',
]

// CSS class tokens that mark a <pre> as author-chosen distinct content
// (poetry stanzas, scriptural verses, leader-dotted tables of contents).
// `mergeConsecutiveOneLinerPres` skips any run where at least one <pre>
// carries one of these tokens. Of all
// matching runs, `wp-block-verse` and `wp-block-preformatted` dominate
// the false-positive cases (split poems, ToCs), while `wp-block-code`
// stays out: fragmented code blocks are the merge's intended target.
export const defaultPreservedPreClasses = [
  'wp-block-verse', // WordPress Gutenberg Verse block: poems, lyrics, scripture stanzas.
  'wp-block-preformatted', // WordPress Gutenberg Preformatted block: author-chosen distinct blocks (ToCs, quotes, numbered headings).
]
