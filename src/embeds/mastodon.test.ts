import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  type MastodonStatus,
  mastodonEmbedResolver,
  parseMastodonStatus,
  readMastodonHeight,
} from './mastodon.js'

describeForEachParser('mastodonEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mastodonEmbedResolver)

  describe('happy paths', () => {
    it('should resolve the status the player url names', async () => {
      const value = html`
        <iframe
          src="https://mastodon.social/@Gargron/116535232552529093/embed"
          class="mastodon-embed"
          style="max-width: 100%; border: 0"
          width="400"
          allowfullscreen="allowfullscreen"
        ></iframe>
        <script src="https://mastodon.social/embed.js" async="async"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'mastodon.social/116535232552529093',
        src: 'https://mastodon.social/@Gargron/116535232552529093/embed',
        url: 'https://mastodon.social/@Gargron/116535232552529093',
        width: 400,
        author: '@Gargron@mastodon.social',
        publisher: 'mastodon.social',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve an iframe shipped without the script', async () => {
      const value = html`
        <iframe
          src="https://octodon.social/@author/109734012345678901/embed"
          class="mastodon-embed"
          style="max-width: 100%; border: 0"
          width="550"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'octodon.social/109734012345678901',
        src: 'https://octodon.social/@author/109734012345678901/embed',
        url: 'https://octodon.social/@author/109734012345678901',
        width: 550,
        author: '@author@octodon.social',
        publisher: 'octodon.social',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve the status the embed url names', async () => {
      const value = html`
        <blockquote
          class="mastodon-embed"
          data-embed-url="https://hachyderm.io/@user/113000000000000001/embed"
          style="background: #FCF8FF; border-radius: 8px; max-width: 540px;"
        >
          <a href="https://hachyderm.io/@user/113000000000000001" target="_blank">
            <div style="color: #787588; margin-top: 16px;">Post by @user@hachyderm.io</div>
            <div style="font-weight: 500;">View on Mastodon</div>
          </a>
        </blockquote>
        <script data-allowed-prefixes="https://hachyderm.io/" async src="https://hachyderm.io/embed.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'hachyderm.io/113000000000000001',
        src: 'https://hachyderm.io/@user/113000000000000001/embed',
        url: 'https://hachyderm.io/@user/113000000000000001',
        author: '@user@hachyderm.io',
        publisher: 'hachyderm.io',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an iframe holding an unrendered template', async () => {
      const value = html`
        <iframe
          src="{{ $status }}/embed"
          class="mastodon-embed"
          style="max-width: 100%; border: 0"
          width="{{ $width }}"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an iframe pointing at a profile', async () => {
      const value = html`
        <iframe
          src="https://mastodon.social/@username"
          class="mastodon-embed"
          width="400"
          height="400"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for an iframe with no src to read', async () => {
      const value = html`
        <iframe class="mastodon-embed" style="width:100%;height:820px;" height="500px"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a blockquote naming no status at all', async () => {
      const value = html`
        <blockquote class="mastodon-embed">
          <a href="https://mastodon.social/@Gargron">View on Mastodon</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The class sits on both the wrapper and the iframe. Only the iframe is selected, so the
    // status is emitted once.
    it('should resolve the inner iframe rather than the wrapper', async () => {
      const value = html`
        <div class="mastodon-embed">
          <iframe
            src="https://chaos.social/@writer/109500123456789012/embed"
            class="mastodon-embed"
            style="max-width: 100%; border: 0"
            width="600"
            height="333"
          ></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'chaos.social/109500123456789012',
        src: 'https://chaos.social/@writer/109500123456789012/embed',
        url: 'https://chaos.social/@writer/109500123456789012',
        width: 600,
        height: 333,
        author: '@writer@chaos.social',
        publisher: 'chaos.social',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Large instances serve embed.js from a CDN host, so the script host is no evidence about
    // the instance and the carrier url is the only source read.
    it('should take the instance from the carrier, not from the script', async () => {
      const value = html`
        <iframe
          src="https://vmst.io/@admin/111234567890123456/embed"
          class="mastodon-embed"
          style="max-width: 100%; border: 0"
          width="400"
        ></iframe>
        <script src="https://cdn-a.vmst.io/embed.js" async="async"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'vmst.io/111234567890123456',
        src: 'https://vmst.io/@admin/111234567890123456/embed',
        url: 'https://vmst.io/@admin/111234567890123456',
        width: 400,
        author: '@admin@vmst.io',
        publisher: 'vmst.io',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a hardened iframe the same way', async () => {
      const value = html`
        <iframe
          src="https://fosstodon.org/@dev/110987654321098765/embed"
          sandbox="allow-scripts allow-same-origin allow-popups"
          allow="fullscreen"
          loading="lazy"
          style="width:100%;border:0"
          class="mastodon-embed"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'fosstodon.org/110987654321098765',
        src: 'https://fosstodon.org/@dev/110987654321098765/embed',
        url: 'https://fosstodon.org/@dev/110987654321098765',
        author: '@dev@fosstodon.org',
        publisher: 'fosstodon.org',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve whatever order the attributes are written in', async () => {
      const value = html`
        <blockquote
          data-embed-url="https://social.lol/@maker/112345678901234567/embed"
          class="mastodon-embed"
        >
          <a href="https://social.lol/@maker/112345678901234567" target="_blank">View on Mastodon</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'social.lol/112345678901234567',
        src: 'https://social.lol/@maker/112345678901234567/embed',
        url: 'https://social.lol/@maker/112345678901234567',
        author: '@maker@social.lol',
        publisher: 'social.lol',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should resolve a blockquote whose class also names the fallback', async () => {
      const value = html`
        <blockquote
          class="mastodon-embed mastodon-embed-fallback"
          data-embed-url="https://mstdn.social/@person/111111111111111111/embed"
          style="background: #FCF8FF;"
        >
          <a href="https://mstdn.social/@person/111111111111111111" target="_blank">View on Mastodon</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'mstdn.social/111111111111111111',
        src: 'https://mstdn.social/@person/111111111111111111/embed',
        url: 'https://mstdn.social/@person/111111111111111111',
        author: '@person@mstdn.social',
        publisher: 'mstdn.social',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('blockquote stripped of its embed url', () => {
    // WordPress filters an auto-discovered oEmbed down to links and blockquotes, which can
    // leave the placeholder with only its anchor to name the status.
    it('should fall back to the anchor inside the blockquote', async () => {
      const value = html`
        <blockquote class="mastodon-embed">
          <a href="https://ruby.social/@coder/110000000000000009" target="_blank">
            <div>Post by @coder@ruby.social</div>
            <div>View on Mastodon</div>
          </a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'ruby.social/110000000000000009',
        src: 'https://ruby.social/@coder/110000000000000009/embed',
        url: 'https://ruby.social/@coder/110000000000000009',
        author: '@coder@ruby.social',
        publisher: 'ruby.social',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The AP-canonical spelling routes to the same page but is deliberately not matched, so a
    // carrier stating it has to leave the anchor beside it free to name the post.
    it('should fall back to the anchor when the embed url is a spelling it does not match', async () => {
      const value = html`
        <blockquote
          class="mastodon-embed"
          data-embed-url="https://ruby.social/users/coder/statuses/110000000000000009/embed"
        >
          <a href="https://ruby.social/@coder/110000000000000009" target="_blank">
            <div>Post by @coder@ruby.social</div>
          </a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'ruby.social/110000000000000009',
        src: 'https://ruby.social/@coder/110000000000000009/embed',
        url: 'https://ruby.social/@coder/110000000000000009',
        author: '@coder@ruby.social',
        publisher: 'ruby.social',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('status iframe with no platform class', () => {
    // Found on a live site rather than in the census, which cannot see this shape: its
    // tokenizer skips path segments starting with `@`, so the prevalence is unmeasured. The
    // embed suffix claims the iframe and the status parse is the only guard left.
    it('should resolve a classless iframe through the status parse alone', async () => {
      const value = html`
        <iframe
          src="https://mastodon.green/@pvonhellermannn/116798038528869495/embed"
          width="400"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'mastodon',
        id: 'mastodon.green/116798038528869495',
        src: 'https://mastodon.green/@pvonhellermannn/116798038528869495/embed',
        url: 'https://mastodon.green/@pvonhellermannn/116798038528869495',
        width: 400,
        author: '@pvonhellermannn@mastodon.green',
        publisher: 'mastodon.green',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // Mastodon's username route constraint excludes `@`, so this path never reaches the embed
  // action: it answers with the application shell under `frame-ancestors 'none'` instead of the
  // status. The embeddable copy lives on the remote instance
  // under a different id, which only `/redirect/statuses/<id>` maps to, so nothing offline
  // recovers it and a minted player would be a frame that cannot load.
  describe('remote post filed under a full handle', () => {
    it('should not claim a status filed under a remote handle', async () => {
      const value = html`
        <iframe
          src="https://mas.to/@author@example.social/113222333444555666/embed"
          class="mastodon-embed"
          width="400"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('markup that only looks like a mastodon embed', () => {
    // A hand-typed quote of a post: the class is the author's own styling hook, the body text
    // is the content, and there is no embed to place. Replacing it would delete the text.
    it('should leave an aside quoting a post by hand alone', async () => {
      const value = html`
        <aside class="mastodon-embed">
          <blockquote>
            <p>Quoted by hand from a post I liked.</p>
          </blockquote>
        </aside>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a WordPress oEmbed of a page titled "Mastodon Embed"', async () => {
      const value = html`
        <blockquote class="wp-embedded-content" data-secret="XwPlrHUEnv">
          <a href="https://blog.example/mastodon-embed/">Mastodon Embed</a>
        </blockquote>
        <iframe
          class="wp-embedded-content"
          sandbox="allow-scripts"
          security="restricted"
          src="https://blog.example/mastodon-embed/embed/#?secret=XwPlrHUEnv"
          width="600"
          height="338"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The embed suffix claims classless iframes, so a url the status parse rejects is the
    // only thing keeping some other site's `/embed` route out of a minted player.
    it('should ignore an embed-suffixed iframe that names no status', async () => {
      const value = html`
        <iframe src="https://blog.example/gallery/slideshow/embed" width="400"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describe('parseMastodonStatus', () => {
  // The network has no fixed host: 121 distinct instances appear across the corpus matches and
  // 83 of them exactly once, so the host is read rather than checked against a list.
  it('should accept any instance host', () => {
    const value = 'https://sonomu.club/@musician/109876543210987654'
    const expected: MastodonStatus = {
      origin: 'https://sonomu.club',
      host: 'sonomu.club',
      user: 'musician',
      id: '109876543210987654',
    }

    expect(parseMastodonStatus(value)).toEqual(expected)
  })

  // The consequence of reading the host rather than checking it: a Medium post url files an
  // author and a snowflake-shaped number the same way, so the reader takes it. Only the
  // resolver's selector keeps one out, which is why no reject case can be written here.
  it('should take a medium url that files an author and a number', () => {
    const value = 'https://medium.com/@author/116535232552529093'
    const expected: MastodonStatus = {
      origin: 'https://medium.com',
      host: 'medium.com',
      user: 'author',
      id: '116535232552529093',
    }

    expect(parseMastodonStatus(value)).toEqual(expected)
  })

  it('should read the status behind the embed suffix', () => {
    const value = 'https://en.osm.town/@mapper/111222333444555666/embed'
    const expected: MastodonStatus = {
      origin: 'https://en.osm.town',
      host: 'en.osm.town',
      user: 'mapper',
      id: '111222333444555666',
    }

    expect(parseMastodonStatus(value)).toEqual(expected)
  })

  it('should ignore a query and a trailing slash', () => {
    const value = 'https://todon.eu/@user/109000000000000000/?utm_source=feed'
    const expected: MastodonStatus = {
      origin: 'https://todon.eu',
      host: 'todon.eu',
      user: 'user',
      id: '109000000000000000',
    }

    expect(parseMastodonStatus(value)).toEqual(expected)
  })

  it('should reject a profile url', () => {
    expect(parseMastodonStatus('https://mastodon.social/@Gargron')).toBeUndefined()
  })

  // Every id the platform mints is an 18-digit snowflake, so a short number is some other
  // site's numbering rather than a status.
  it('should reject a path ending in a short number', () => {
    expect(parseMastodonStatus('https://shop.example/@brand/42')).toBeUndefined()
  })

  it('should reject the ActivityPub spelling of a status url', () => {
    expect(
      parseMastodonStatus('https://mastodon.social/users/Gargron/statuses/116535232552529093'),
    ).toBeUndefined()
  })

  it('should reject a url whose scheme cannot host an embed', () => {
    expect(parseMastodonStatus('javascript:/@user/116535232552529093/embed')).toBeUndefined()
  })

  it('should reject a template that never rendered', () => {
    expect(parseMastodonStatus('{{ $status }}/embed')).toBeUndefined()
  })
})

describe('readMastodonHeight', () => {
  it('should read the height out of the answer to its request', () => {
    expect(readMastodonHeight({ type: 'setHeight', id: 0, height: 747 })).toBe(747)
  })

  it('should read nothing out of another message', () => {
    expect(readMastodonHeight({ type: 'ready' })).toBeUndefined()
  })
})
