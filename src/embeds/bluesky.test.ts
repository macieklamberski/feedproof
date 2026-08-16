import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, jsonAttrValue, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  blueskyBlockquoteEmbedResolver,
  blueskyIframeEmbedResolver,
  blueskyPostElementEmbedResolver,
  blueskyS9eEmbedResolver,
} from './bluesky.js'

describeForEachParser('blueskyBlockquoteEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, blueskyBlockquoteEmbedResolver)

  describe('bare canonical blockquote', () => {
    it('should read the post, its text, its author and its date', async () => {
      const value = html`
        <blockquote
          class="bluesky-embed"
          data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3kq7aeuwbg42k"
          data-bluesky-cid="bafyreidjmtwpdo6lglgdba3t5nenexmnp36j7unjcotg7hodbzldwowgci"
          data-bluesky-embed-color-mode="system"
        >
          <p lang="en">Just shipped: Bluesky post embeds!</p>
          <p>
            &mdash;
            <a href="https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur?ref_src=embed">Bluesky (@bsky.app)</a>
            <a href="https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur/post/3kq7aeuwbg42k?ref_src=embed">2024-04-15T21:48:40.709Z</a>
          </p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:z72i7hdynmk6r22z27h6tvur/3kq7aeuwbg42k',
        src: 'https://embed.bsky.app/embed/did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3kq7aeuwbg42k',
        url: 'https://bsky.app/profile/did:plc:z72i7hdynmk6r22z27h6tvur/post/3kq7aeuwbg42k',
        description: 'Just shipped: Bluesky post embeds!',
        author: 'Bluesky (@bsky.app)',
        date: '2024-04-15T21:48:40.709Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('WordPress Gutenberg figure', () => {
    // The footer sits loose in the blockquote here rather than in a paragraph of its own.
    it('should read a post wrapped in the block-editor figure', async () => {
      const value = html`
        <figure class="wp-block-embed is-type-rich is-provider-bluesky-social wp-block-embed-bluesky-social">
          <div class="wp-block-embed__wrapper">
            <blockquote
              class="bluesky-embed"
              data-bluesky-uri="at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p"
              data-bluesky-cid="bafyreib2rxkhbjfrjlmpwjrfxkxvvnzybvhr3sedcqbovqhkr6qk4hzffe"
            >
              <p lang="en">The block editor pastes the oEmbed html verbatim.</p>
              &mdash;
              <a href="https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz?ref_src=embed">Display Name (@user.bsky.social)</a>
              <a href="https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz/post/3lbwtqmxbec2p?ref_src=embed">2025-01-02T03:04:05.006Z</a>
            </blockquote>
          </div>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:ewvi7nxzyoun6zhxrhs64oiz/3lbwtqmxbec2p',
        src: 'https://embed.bsky.app/embed/did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p',
        url: 'https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz/post/3lbwtqmxbec2p',
        description: 'The block editor pastes the oEmbed html verbatim.',
        author: 'Display Name (@user.bsky.social)',
        date: '2025-01-02T03:04:05.006Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Three provider slugs are in use — `bluesky-social`, `bluesky-embed` and a bare
    // `bluesky` — but they only ever name the figure, and the blockquote inside is the same.
    it('should read a post under the bare provider slug', async () => {
      const value = html`
        <figure class="wp-block-embed is-type-rich is-provider-bluesky wp-block-embed-bluesky">
          <div class="wp-block-embed__wrapper">
            <blockquote
              class="bluesky-embed"
              data-bluesky-uri="at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p"
            >
              <p lang="en">Slug variations live on the figure, not the quote.</p>
            </blockquote>
          </div>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:ewvi7nxzyoun6zhxrhs64oiz/3lbwtqmxbec2p',
        src: 'https://embed.bsky.app/embed/did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3lbwtqmxbec2p',
        url: 'https://bsky.app/profile/did:plc:ewvi7nxzyoun6zhxrhs64oiz/post/3lbwtqmxbec2p',
        description: 'Slug variations live on the figure, not the quote.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('theme wrapper with an inline loader script', () => {
    it('should read a post beside the embed script', async () => {
      const value = html`
        <div class="embed-blueskysocial">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3ldz3mmxjks2n"
            data-bluesky-cid="bafyreicnkjkxvvnzybvhr3sedcqbovqhkr6qk4hzffeb2rxkhbjfrjlmpw"
          >
            <p lang="en">The loader script never runs in a reader.</p>
            <p>
              &mdash;
              <a href="https://bsky.app/profile/did:plc:oisofpd7lj26yvgiivf3lxsi?ref_src=embed">Theme Author (@theme.example)</a>
              <a href="https://bsky.app/profile/did:plc:oisofpd7lj26yvgiivf3lxsi/post/3ldz3mmxjks2n?ref_src=embed">2025-02-03T04:05:06.007Z</a>
            </p>
          </blockquote>
          <p><script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script></p>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:oisofpd7lj26yvgiivf3lxsi/3ldz3mmxjks2n',
        src: 'https://embed.bsky.app/embed/did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3ldz3mmxjks2n',
        url: 'https://bsky.app/profile/did:plc:oisofpd7lj26yvgiivf3lxsi/post/3ldz3mmxjks2n',
        description: 'The loader script never runs in a reader.',
        author: 'Theme Author (@theme.example)',
        date: '2025-02-03T04:05:06.007Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Ghost embed card', () => {
    // Ghost adds `&ref=` to the anchors, which must not stop the permalink being read.
    it('should read a post inside the card figure', async () => {
      const value = html`
        <figure class="kg-card kg-embed-card">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:44ybard66vv44zksje25o7dz/app.bsky.feed.post/3lgevqvpjac2u"
            data-bluesky-cid="bafyreid5u4ws6bv7o3wtg6oaimh2a7kk33fvrpjubyboiywp4vvk6ci32q"
          >
            <p lang="en">Ghost keeps the script inside the figure.</p>
            &#x2014;
            <a href="https://bsky.app/profile/did:plc:44ybard66vv44zksje25o7dz?ref_src=embed&amp;ref=publisher.example">Ghost Writer (@ghost.example)</a>
            <a href="https://bsky.app/profile/did:plc:44ybard66vv44zksje25o7dz/post/3lgevqvpjac2u?ref_src=embed&amp;ref=publisher.example">2025-03-04T05:06:07.008Z</a>
            <script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>
          </blockquote>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:44ybard66vv44zksje25o7dz/3lgevqvpjac2u',
        src: 'https://embed.bsky.app/embed/did:plc:44ybard66vv44zksje25o7dz/app.bsky.feed.post/3lgevqvpjac2u',
        url: 'https://bsky.app/profile/did:plc:44ybard66vv44zksje25o7dz/post/3lgevqvpjac2u',
        description: 'Ghost keeps the script inside the figure.',
        author: 'Ghost Writer (@ghost.example)',
        date: '2025-03-04T05:06:07.008Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('display name written outside the profile link', () => {
    it('should compose the author from both sides of the link', async () => {
      const value = html`
        <div class="raw-embed">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:kdrlfhxenchjqnbtqvxpwsnu/app.bsky.feed.post/3lhk2yq6xzc2f"
            data-bluesky-embed-color-mode="system"
          >
            <p lang="en">Some publishers link only the handle.</p>
            &mdash; Display Name (<a href="https://bsky.app/profile/did:plc:kdrlfhxenchjqnbtqvxpwsnu?ref_src=embed">@user.bsky.social</a>)
            <a href="https://bsky.app/profile/did:plc:kdrlfhxenchjqnbtqvxpwsnu/post/3lhk2yq6xzc2f?ref_src=embed">2025-04-05T06:07:08.009Z</a>
          </blockquote>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:kdrlfhxenchjqnbtqvxpwsnu/3lhk2yq6xzc2f',
        src: 'https://embed.bsky.app/embed/did:plc:kdrlfhxenchjqnbtqvxpwsnu/app.bsky.feed.post/3lhk2yq6xzc2f',
        url: 'https://bsky.app/profile/did:plc:kdrlfhxenchjqnbtqvxpwsnu/post/3lhk2yq6xzc2f',
        description: 'Some publishers link only the handle.',
        author: 'Display Name (@user.bsky.social)',
        date: '2025-04-05T06:07:08.009Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('break-separated blockquote with no paragraphs', () => {
    it('should read the text before the first break and skip the media marker', async () => {
      const value = html`
        <div class="rm-embed embed-media">
          <blockquote
            class="bluesky-embed"
            data-bluesky-cid="bafyreia4jhgrtbu5utwbwmfm4aqva6xf5r56rybtapfkcvqo2oi47ij2p4"
            data-bluesky-embed-color-mode="system"
            data-bluesky-uri="at://did:plc:tgudj2fjmgcl2w7qzruzxfmy/app.bsky.feed.post/3lj7bvrr4yk2l"
          >
            A post with a picture attached.<br />
            <br />
            <a href="https://bsky.app/profile/did:plc:tgudj2fjmgcl2w7qzruzxfmy/post/3lj7bvrr4yk2l?ref_src=embed">[image or embed]</a>
            <br />
            — Newsroom (<a href="https://bsky.app/profile/did:plc:tgudj2fjmgcl2w7qzruzxfmy?ref_src=embed">@newsroom.example</a>)
            <a href="https://bsky.app/profile/did:plc:tgudj2fjmgcl2w7qzruzxfmy/post/3lj7bvrr4yk2l?ref_src=embed">2025-05-06T07:08:09.010Z</a>
          </blockquote>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:tgudj2fjmgcl2w7qzruzxfmy/3lj7bvrr4yk2l',
        src: 'https://embed.bsky.app/embed/did:plc:tgudj2fjmgcl2w7qzruzxfmy/app.bsky.feed.post/3lj7bvrr4yk2l',
        url: 'https://bsky.app/profile/did:plc:tgudj2fjmgcl2w7qzruzxfmy/post/3lj7bvrr4yk2l',
        description: 'A post with a picture attached.',
        author: 'Newsroom (@newsroom.example)',
        date: '2025-05-06T07:08:09.010Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('page-builder shortcode', () => {
    it('should drop a media marker written inside the text paragraph', async () => {
      const value = html`
        <div class="elementor-widget-container">
          <div class="elementor-shortcode">
            <blockquote
              class="bluesky-embed"
              data-bluesky-uri="at://did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/app.bsky.feed.post/3lm4lzkrnk22d"
            >
              <p lang="en">Attached media sits in the same paragraph.<br />
                <br />
                <a href="https://bsky.app/profile/did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/post/3lm4lzkrnk22d?ref_src=embed">[image or embed]</a>
              </p>
              &mdash; Builder (<a href="https://bsky.app/profile/did:plc:6xkqmwpqhsbnvmqvdvbjzcyz?ref_src=embed">@builder.example</a>)
              <a href="https://bsky.app/profile/did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/post/3lm4lzkrnk22d?ref_src=embed">2025-06-07T08:09:10.011Z</a>
            </blockquote>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/3lm4lzkrnk22d',
        src: 'https://embed.bsky.app/embed/did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/app.bsky.feed.post/3lm4lzkrnk22d',
        url: 'https://bsky.app/profile/did:plc:6xkqmwpqhsbnvmqvdvbjzcyz/post/3lm4lzkrnk22d',
        description: 'Attached media sits in the same paragraph.',
        author: 'Builder (@builder.example)',
        date: '2025-06-07T08:09:10.011Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep post text in any language', async () => {
      const value = html`
        <div class="et_pb_code_inner">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:5rowmpbfyfhbmpmldxtqzcnj/app.bsky.feed.post/3ln54ry2iwc2x"
            data-bluesky-embed-color-mode="system"
          >
            <p lang="de">Ein Beitrag auf Deutsch.</p>
            — Autorin (<a href="https://bsky.app/profile/did:plc:5rowmpbfyfhbmpmldxtqzcnj?ref_src=embed">@autorin.example</a>)
            <a href="https://bsky.app/profile/did:plc:5rowmpbfyfhbmpmldxtqzcnj/post/3ln54ry2iwc2x?ref_src=embed">2025-07-08T09:10:11.012Z</a>
          </blockquote>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:5rowmpbfyfhbmpmldxtqzcnj/3ln54ry2iwc2x',
        src: 'https://embed.bsky.app/embed/did:plc:5rowmpbfyfhbmpmldxtqzcnj/app.bsky.feed.post/3ln54ry2iwc2x',
        url: 'https://bsky.app/profile/did:plc:5rowmpbfyfhbmpmldxtqzcnj/post/3ln54ry2iwc2x',
        description: 'Ein Beitrag auf Deutsch.',
        author: 'Autorin (@autorin.example)',
        date: '2025-07-08T09:10:11.012Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('editor block carrying an encoded copy of itself', () => {
    // The editor stores the whole snippet a second time, double-encoded, in an attribute on
    // the wrapper. The rendered blockquote beside it is the one worth reading.
    it('should read the rendered blockquote and not the attribute copy', async () => {
      const value = html`
        <div
          class="dk-editor-embed center-block"
          data-bluesky-content="&amp;lt;blockquote class=&quot;bluesky-embed&quot; data-bluesky-uri=&quot;at://did:plc:otherotherotherotherothe/app.bsky.feed.post/3zzzzzzzzzzzz&quot;&amp;gt;&amp;lt;/blockquote&amp;gt;"
        >
          <div class="remove-embed-content">x</div>
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:qjeavhlw222ppsre4rscd3n2/app.bsky.feed.post/3lpyqevbqvk2j"
          >
            <p lang="en">The editor keeps a second, encoded copy.</p>
            &mdash;
            <a href="https://bsky.app/profile/did:plc:qjeavhlw222ppsre4rscd3n2?ref_src=embed">Editor (@editor.example)</a>
            <a href="https://bsky.app/profile/did:plc:qjeavhlw222ppsre4rscd3n2/post/3lpyqevbqvk2j?ref_src=embed">2025-08-09T10:11:12.013Z</a>
          </blockquote>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:qjeavhlw222ppsre4rscd3n2/3lpyqevbqvk2j',
        src: 'https://embed.bsky.app/embed/did:plc:qjeavhlw222ppsre4rscd3n2/app.bsky.feed.post/3lpyqevbqvk2j',
        url: 'https://bsky.app/profile/did:plc:qjeavhlw222ppsre4rscd3n2/post/3lpyqevbqvk2j',
        description: 'The editor keeps a second, encoded copy.',
        author: 'Editor (@editor.example)',
        date: '2025-08-09T10:11:12.013Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('deprecated centering wrapper', () => {
    it('should strip a plain double-hyphen separator from the author', async () => {
      const value = html`
        <center>
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:hvakvedv6byxhufjl4fwfnyf/app.bsky.feed.post/3lqmk6ipt5v22"
          >
            <p lang="en">An old-fashioned wrapper.</p>
            -- Retro (<a href="https://bsky.app/profile/did:plc:hvakvedv6byxhufjl4fwfnyf?ref_src=embed">@retro.example</a>)
            <a href="https://bsky.app/profile/did:plc:hvakvedv6byxhufjl4fwfnyf/post/3lqmk6ipt5v22?ref_src=embed">2025-09-10T11:12:13.014Z</a>
          </blockquote>
        </center>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:hvakvedv6byxhufjl4fwfnyf/3lqmk6ipt5v22',
        src: 'https://embed.bsky.app/embed/did:plc:hvakvedv6byxhufjl4fwfnyf/app.bsky.feed.post/3lqmk6ipt5v22',
        url: 'https://bsky.app/profile/did:plc:hvakvedv6byxhufjl4fwfnyf/post/3lqmk6ipt5v22',
        description: 'An old-fashioned wrapper.',
        author: 'Retro (@retro.example)',
        date: '2025-09-10T11:12:13.014Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('blockquote with no data attributes', () => {
    // One feed format ships the quote with every `data-bluesky-*` attribute stripped, so the
    // permalink in the footer is the only thing naming the post.
    it('should fall back to the permalink in the footer', async () => {
      const value = html`
        <blockquote class="bluesky-embed">
          <p lang="en">Only the class survived the export.</p>
          — Stripped (<a href="https://bsky.app/profile/did:plc:2ka2wpbfyfhbmpmldxtqzcnj?ref_src=embed">@stripped.example</a>)
          <a href="https://bsky.app/profile/did:plc:2ka2wpbfyfhbmpmldxtqzcnj/post/3lr7aeuwbg42k?ref_src=embed">2025-10-11T12:13:14.015Z</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:2ka2wpbfyfhbmpmldxtqzcnj/3lr7aeuwbg42k',
        src: 'https://embed.bsky.app/embed/did:plc:2ka2wpbfyfhbmpmldxtqzcnj/app.bsky.feed.post/3lr7aeuwbg42k',
        url: 'https://bsky.app/profile/did:plc:2ka2wpbfyfhbmpmldxtqzcnj/post/3lr7aeuwbg42k',
        description: 'Only the class survived the export.',
        author: 'Stripped (@stripped.example)',
        date: '2025-10-11T12:13:14.015Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('blockquote with the class stripped', () => {
    // The opposite stripping: some feeds drop the class and keep the attributes, so the
    // declared AT URI is the only thing marking the quote as Bluesky's.
    it('should match through the declared AT URI when no class survives', async () => {
      const value = html`
        <blockquote data-bluesky-uri="at://did:plc:6kz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42">
          <p lang="en">Only the attributes survived the export.</p>
          — Classless (<a href="https://bsky.app/profile/did:plc:6kz4agnyzcrsvpnprxrbjrpa?ref_src=embed">@classless.example</a>)
          <a href="https://bsky.app/profile/did:plc:6kz4agnyzcrsvpnprxrbjrpa/post/3lvq7aeuwbg42?ref_src=embed">2025-11-12T13:14:15.016Z</a>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:6kz4agnyzcrsvpnprxrbjrpa/3lvq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:6kz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:6kz4agnyzcrsvpnprxrbjrpa/post/3lvq7aeuwbg42',
        description: 'Only the attributes survived the export.',
        author: 'Classless (@classless.example)',
        date: '2025-11-12T13:14:15.016Z',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('blockquote attribute variations', () => {
    it('should match an extra class token beside the embed class', async () => {
      const value = html`
        <blockquote
          class="bluesky-embed blockquote"
          data-bluesky-uri="at://did:plc:3jz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lsq7aeuwbg42"
        >
          <p lang="en">A theme added its own class.</p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:3jz4agnyzcrsvpnprxrbjrpa/3lsq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:3jz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lsq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:3jz4agnyzcrsvpnprxrbjrpa/post/3lsq7aeuwbg42',
        description: 'A theme added its own class.',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match a blockquote carrying a deprecated align attribute', async () => {
      const value = html`
        <blockquote
          align="center"
          class="bluesky-embed"
          data-bluesky-uri="at://did:plc:4hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3ltq7aeuwbg42"
        >
          <p dir="ltr" lang="en">Aligned the HTML4 way.</p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:4hz4agnyzcrsvpnprxrbjrpa/3ltq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:4hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3ltq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:4hz4agnyzcrsvpnprxrbjrpa/post/3ltq7aeuwbg42',
        description: 'Aligned the HTML4 way.',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match a blockquote carrying an inline style', async () => {
      const value = html`
        <blockquote
          style="margin:0 auto"
          class="bluesky-embed"
          data-bluesky-uri="at://did:plc:5hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3luq7aeuwbg42"
          data-bluesky-embed-color-mode="dark"
        >
          <p lang="en">Centred with inline css.</p>
        </blockquote>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:5hz4agnyzcrsvpnprxrbjrpa/3luq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:5hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3luq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:5hz4agnyzcrsvpnprxrbjrpa/post/3luq7aeuwbg42',
        description: 'Centred with inline css.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('nesting the feed exporter produced', () => {
    it('should match a blockquote wrapped in a paragraph', async () => {
      const value = html`
        <p class="wp-block-paragraph">
          <blockquote
            class="bluesky-embed"
            data-bluesky-uri="at://did:plc:6hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42"
          >
            <p lang="en">Invalid nesting, still a post.</p>
          </blockquote>
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:6hz4agnyzcrsvpnprxrbjrpa/3lvq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:6hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lvq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:6hz4agnyzcrsvpnprxrbjrpa/post/3lvq7aeuwbg42',
        description: 'Invalid nesting, still a post.',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match a blockquote under a hashed css-in-js wrapper', async () => {
      const value = html`
        <div class="css-53u6y8">
          <div class="embed-blueskysocial">
            <blockquote
              class="bluesky-embed"
              data-bluesky-uri="at://did:plc:7hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lwq7aeuwbg42"
            >
              <p lang="en">The hashed class cannot be selected on.</p>
            </blockquote>
          </div>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:7hz4agnyzcrsvpnprxrbjrpa/3lwq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:7hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lwq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:7hz4agnyzcrsvpnprxrbjrpa/post/3lwq7aeuwbg42',
        description: 'The hashed class cannot be selected on.',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should match a blockquote inside a bespoke grid theme', async () => {
      const value = html`
        <section class="grid-main gap-y-4">
          <figure class="col-span-5 sm:col-span-10 md:col-span-8">
            <blockquote
              class="bluesky-embed"
              data-bluesky-uri="at://did:plc:8hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lxq7aeuwbg42"
            >
              <p lang="en">A hand-rolled theme.</p>
            </blockquote>
          </figure>
        </section>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:8hz4agnyzcrsvpnprxrbjrpa/3lxq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:8hz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3lxq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:8hz4agnyzcrsvpnprxrbjrpa/post/3lxq7aeuwbg42',
        description: 'A hand-rolled theme.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('guards', () => {
    it('should not read a permalink hosted somewhere else', async () => {
      const value = html`
        <blockquote class="bluesky-embed">
          <p lang="en">A link that only looks like a permalink.</p>
          <a href="https://evil.test/bsky.app/profile/did:plc:9hz4agnyzcrsvpnprxrbjrpa/post/3lyq7aeuwbg42">2025-11-12T13:14:15.016Z</a>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should refuse an at uri naming another record type', async () => {
      const value = html`
        <blockquote
          class="bluesky-embed"
          data-bluesky-uri="at://did:plc:9hz4agnyzcrsvpnprxrbjrpa/app.bsky.actor.profile/self"
        >
          <p lang="en">A profile record is not a post.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should refuse an authority that is neither a did nor a handle', async () => {
      const value = html`
        <blockquote
          class="bluesky-embed"
          data-bluesky-uri="at://not an authority/app.bsky.feed.post/3lzq7aeuwbg42"
        >
          <p lang="en">Nothing addressable here.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return nothing for a blockquote naming no post at all', async () => {
      const value = html`
        <blockquote class="bluesky-embed">
          <p lang="en">The identifier is gone entirely.</p>
        </blockquote>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The same class names a `<div>` wrapping an iframe, which the iframe resolver owns.
    it('should not claim a div carrying the embed class', async () => {
      const value = html`
        <div class="bluesky-embed">
          <iframe src="https://embed.bsky.app/embed/did:plc:ahz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3maq7aeuwbg42"></iframe>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('blueskyIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, blueskyIframeEmbedResolver)

  // Substack wraps the player in a div whose `data-attrs` holds the whole post as JSON, stored in
  // a double-quoted attribute with the inner quotes HTML-encoded, which is what survives a parse
  // and serialise roundtrip. The wrapper states a flex box with an automatic height, which is no
  // size at all, so the placeholder takes none from it.
  describe('newsletter wrapper carrying the post as JSON', () => {
    it('should map the whole payload onto the placeholder', async () => {
      const payload = {
        postId: '3mbq7aeuwbg42',
        authorDid: 'did:plc:bhz4agnyzcrsvpnprxrbjrpa',
        authorName: 'Newsletter Author',
        authorHandle: 'author.example',
        authorAvatarUrl:
          'https://cdn.bsky.app/img/avatar/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreiavatar@jpeg',
        text: 'The wrapper carries the post twice over.',
        createdAt: '2025-12-13T14:15:16.017Z',
        uri: 'at://did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42',
        imageUrls: [
          'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreithumb@jpeg',
        ],
      }
      const value = html`
        <div
          class="bluesky-wrap outer"
          style="height: auto; display: flex; margin-bottom: 24px;"
          data-attrs="${jsonAttrValue(payload)}"
          data-component-name="BlueskyCreateBlueskyEmbed"
        >
          <iframe
            id="bluesky-3mbq7aeuwbg42"
            data-bluesky-id="1234567890123456"
            src="https://embed.bsky.app/embed/did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42?id=1234567890123456"
            width="100%"
            frameborder="0"
            scrolling="no"
          ></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:bhz4agnyzcrsvpnprxrbjrpa/3mbq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:bhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mbq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:bhz4agnyzcrsvpnprxrbjrpa/post/3mbq7aeuwbg42',
        description: 'The wrapper carries the post twice over.',
        author: 'Newsletter Author (@author.example)',
        avatar:
          'https://cdn.bsky.app/img/avatar/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreiavatar@jpeg',
        thumbnail:
          'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:bhz4agnyzcrsvpnprxrbjrpa/bafkreithumb@jpeg',
        date: '2025-12-13T14:15:16.017Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take a video post poster from the video host', async () => {
      const payload = {
        authorName: 'Video Author',
        authorHandle: 'video.example',
        text: 'A post with a clip.',
        createdAt: '2026-01-14T15:16:17.018Z',
        imageUrls: [
          'https://video.bsky.app/watch/did:plc:chz4agnyzcrsvpnprxrbjrpa/bafkreivideo/thumbnail.jpg',
        ],
      }
      const value = html`
        <div
          class="bluesky-wrap outer"
          style="height: auto; display: flex; margin-bottom: 24px;"
          data-attrs="${jsonAttrValue(payload)}"
          data-component-name="BlueskyCreateBlueskyEmbed"
        >
          <iframe src="https://embed.bsky.app/embed/did:plc:chz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mcq7aeuwbg42?id=1"></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:chz4agnyzcrsvpnprxrbjrpa/3mcq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:chz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mcq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:chz4agnyzcrsvpnprxrbjrpa/post/3mcq7aeuwbg42',
        description: 'A post with a clip.',
        author: 'Video Author (@video.example)',
        thumbnail:
          'https://video.bsky.app/watch/did:plc:chz4agnyzcrsvpnprxrbjrpa/bafkreivideo/thumbnail.jpg',
        date: '2026-01-14T15:16:17.018Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore media urls served from another host', async () => {
      const payload = {
        authorHandle: 'author.example',
        authorAvatarUrl: 'https://evil.test/cdn.bsky.app/avatar.jpg',
        imageUrls: ['https://evil.test/cdn.bsky.app/thumb.jpg'],
      }
      const value = html`
        <div
          class="bluesky-wrap outer"
          style="height: auto; display: flex; margin-bottom: 24px;"
          data-attrs="${jsonAttrValue(payload)}"
          data-component-name="BlueskyCreateBlueskyEmbed"
        >
          <iframe src="https://embed.bsky.app/embed/did:plc:dhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mdq7aeuwbg42?id=1"></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:dhz4agnyzcrsvpnprxrbjrpa/3mdq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:dhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mdq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:dhz4agnyzcrsvpnprxrbjrpa/post/3mdq7aeuwbg42',
        author: '@author.example',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('player iframe pasted on its own', () => {
    it('should read a post from the player url', async () => {
      const value = html`
        <figure class="kg-card kg-embed-card">
          <iframe
            data-bluesky-id="9876543210987654"
            src="https://embed.bsky.app/embed/did:plc:ehz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3meq7aeuwbg42?id=9876543210987654&amp;ref_url=https%253A%252F%252Fpublisher.example%252F"
            width="100%"
            frameborder="0"
            scrolling="no"
          ></iframe>
        </figure>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:ehz4agnyzcrsvpnprxrbjrpa/3meq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:ehz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3meq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:ehz4agnyzcrsvpnprxrbjrpa/post/3meq7aeuwbg42',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a post from a player url carrying a colour mode', async () => {
      const value = html`
        <div class="bluesky-embed">
          <iframe
            src="https://embed.bsky.app/embed/did:plc:fhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mfq7aeuwbg42?id=1122334455667788&amp;colorMode=system"
            width="100%"
            frameborder="0"
            scrolling="no"
            data-mce-fragment="1"
          ></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:fhz4agnyzcrsvpnprxrbjrpa/3mfq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:fhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mfq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:fhz4agnyzcrsvpnprxrbjrpa/post/3mfq7aeuwbg42',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('guards', () => {
    it('should not read a player path spelled on another host', async () => {
      const value = html`
        <iframe src="https://evil.test/embed.bsky.app/embed/did:plc:ghz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mgq7aeuwbg42"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return nothing for a bluesky url naming no post', async () => {
      const value = html`
        <iframe src="https://embed.bsky.app/embed/did:plc:ghz4agnyzcrsvpnprxrbjrpa"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('blueskyS9eEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, blueskyS9eEmbedResolver)

  describe('forum helper page', () => {
    it('should read the post named in the url fragment', async () => {
      const value = html`
        <iframe
          data-s9e-mediaembed="bluesky"
          allowfullscreen=""
          scrolling="no"
          src="https://s9e.github.io/iframe/2/bluesky.min.html#at://did:plc:hhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mhq7aeuwbg42#embed.bsky.app"
          style="height:600px;width:600px"
          data-s9e-mediaembed-api="2"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:hhz4agnyzcrsvpnprxrbjrpa/3mhq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:hhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mhq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:hhz4agnyzcrsvpnprxrbjrpa/post/3mhq7aeuwbg42',
        // The helper page states the box it renders into as an inline style.
        width: 600,
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('guards', () => {
    it('should return nothing when the fragment names no post', async () => {
      const value = html`
        <iframe
          data-s9e-mediaembed="bluesky"
          src="https://s9e.github.io/iframe/2/bluesky.min.html"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('blueskyPostElementEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, blueskyPostElementEmbedResolver)

  describe('custom element with a declarative shadow root', () => {
    // This carrier names the author by handle rather than a did, and is the only one that
    // does. The player url is composed the same way regardless.
    it('should read the post from the at uri and the fallback quote', async () => {
      const value = html`
        <bluesky-post allow-unauthenticated="true" contextless="true" silent="true" src="at://newsroom.example/app.bsky.feed.post/3miq7aeuwbg42">
          <template shadowrootmode="open">
            <link href="https://cdn.jsdelivr.net/npm/bluesky-post-embed@^1.0.2/dist/core.min.css" rel="stylesheet" />
            <slot></slot>
          </template>
          <blockquote>
            <p dir="auto">The web component never mounts in a reader.</p>
            <p>
              — Newsroom (@newsroom.example)
              <a href="https://bsky.app/profile/newsroom.example/post/3miq7aeuwbg42">2026-02-15T16:17:18.019Z</a>
            </p>
          </blockquote>
        </bluesky-post>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'newsroom.example/3miq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/newsroom.example/app.bsky.feed.post/3miq7aeuwbg42',
        url: 'https://bsky.app/profile/newsroom.example/post/3miq7aeuwbg42',
        description: 'The web component never mounts in a reader.',
        author: 'Newsroom (@newsroom.example)',
        date: '2026-02-15T16:17:18.019Z',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should mint the player url when the at uri names a did', async () => {
      const value = html`
        <bluesky-post src="at://did:plc:jhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mjq7aeuwbg42">
          <blockquote>
            <p dir="auto">A did addresses the player directly.</p>
          </blockquote>
        </bluesky-post>
      `
      const expected: EmbedResolverResult = {
        provider: 'bluesky',
        id: 'did:plc:jhz4agnyzcrsvpnprxrbjrpa/3mjq7aeuwbg42',
        src: 'https://embed.bsky.app/embed/did:plc:jhz4agnyzcrsvpnprxrbjrpa/app.bsky.feed.post/3mjq7aeuwbg42',
        url: 'https://bsky.app/profile/did:plc:jhz4agnyzcrsvpnprxrbjrpa/post/3mjq7aeuwbg42',
        description: 'A did addresses the player directly.',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('guards', () => {
    it('should return nothing for a src that is not an at uri', async () => {
      const value = html`
        <bluesky-post src="https://bsky.app/profile/newsroom.example/post/3mkq7aeuwbg42">
          <blockquote>
            <p dir="auto">Not the documented form.</p>
          </blockquote>
        </bluesky-post>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})
