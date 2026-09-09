import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  codepenIframeEmbedResolver,
  codepenResolveEmbed,
  codepenWidgetEmbedResolver,
} from './codepen.js'

// Every `data-embed-*` field the placeholder carries, for the shapes that only resolve once the
// pipeline has repaired them and so cannot be asserted on the resolver alone.
const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
  const element = parseHtml(result).querySelector('[data-embed-src]')
  const fields: Record<string, string> = {}

  for (const name of element?.getAttributeNames() ?? []) {
    const value = element?.getAttribute(name)

    if (name.startsWith('data-embed-') && value) {
      fields[name.replace('data-embed-', '')] = value
    }
  }

  return fields
}

describe('codepenResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a player url', () => {
      const value = 'https://codepen.io/argyleink/embed/XJpKqXm'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(codepenResolveEmbed(value)).toEqual(expected)
    })

    // The author's own query picks which panes open and which theme they use, so the url the
    // publisher wrote is what travels rather than one rebuilt from the slug.
    it('should keep the query the publisher wrote', () => {
      const value = 'https://codepen.io/argyleink/embed/XJpKqXm?default-tab=css%2Cresult'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?default-tab=css%2Cresult',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(codepenResolveEmbed(value)).toEqual(expected)
    })

    // Three slug lengths are already in the wild, and the length is not what names a pen.
    it('should resolve a slug longer than the ones minted so far', () => {
      const value = 'https://codepen.io/argyleink/embed/XJpKqXmAndThenSomeMoreCharactersStillGoing'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXmAndThenSomeMoreCharactersStillGoing',
        src: 'https://codepen.io/argyleink/embed/XJpKqXmAndThenSomeMoreCharactersStillGoing',
        url: 'https://codepen.io/argyleink/pen/XJpKqXmAndThenSomeMoreCharactersStillGoing',
        thumbnail:
          'https://shots.codepen.io/argyleink/pen/XJpKqXmAndThenSomeMoreCharactersStillGoing-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(codepenResolveEmbed(value)).toEqual(expected)
    })

    // The username selects the pen's page and its screenshot, and its length selects neither.
    it('should keep an author longer than the handles CodePen issues today', () => {
      const value = 'https://codepen.io/argyleink-with-a-much-longer-handle/embed/XJpKqXm'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink-with-a-much-longer-handle/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink-with-a-much-longer-handle/pen/XJpKqXm',
        thumbnail:
          'https://shots.codepen.io/argyleink-with-a-much-longer-handle/pen/XJpKqXm-512.jpg',
        author: '@argyleink-with-a-much-longer-handle',
        height: 300,
      }

      expect(codepenResolveEmbed(value)).toEqual(expected)
    })
  })

  // A team owns its pens one segment deeper. No sampled feed carries one, and CodePen blocks
  // automated requests, so the shape is read from the url rather than confirmed against a live
  // pen. The team prefix has to survive into `url`, which is the only field the owner selects.
  describe('a team pen, which sits under an extra path segment', () => {
    it('should read the pen from behind the team segment', () => {
      const value = 'https://codepen.io/team/keyframers/embed/XJpKqXm'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/team/keyframers/embed/XJpKqXm',
        url: 'https://codepen.io/team/keyframers/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/keyframers/pen/XJpKqXm-512.jpg',
        author: '@keyframers',
        height: 300,
      }

      expect(codepenResolveEmbed(value)).toEqual(expected)
    })

    it('should ignore a bare team profile, which names no pen', () => {
      const value = 'https://codepen.io/team/keyframers'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should ignore a pen page, which is a link rather than a player', () => {
      const value = 'https://codepen.io/argyleink/pen/XJpKqXm'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    // The path here is a valid embed path, so only the host check can reject it. A realistic
    // blog url would fall out on the path instead and leave this guard unexercised.
    it('should ignore a subdomain even when the path names a pen', () => {
      const value = 'https://blog.codepen.io/argyleink/embed/XJpKqXm'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    // `cpe` is the 2.0 editor's own path and the prefill endpoint sits under it, so this has the
    // exact shape of a pen url while naming no pen. Read as a username it mints a bogus pen.
    it('should ignore a path segment CodePen owns in the username position', () => {
      const value = 'https://codepen.io/cpe/embed/prefill'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    // A separate product with its own id space and no screenshot endpoint. Zero in the corpus.
    it('should ignore a project embed', () => {
      const value = 'https://codepen.io/argyleink/project/embed/ABCDEF'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    // `cdpn.io` serves a pen's raw output without the player chrome, so it is not an embed.
    it('should ignore the asset host', () => {
      const value = 'https://cdpn.io/pen/debug/XJpKqXm/abc123'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/codepen.io/argyleink/embed/XJpKqXm'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a slug carrying a file name', () => {
      const value = 'https://codepen.io/argyleink/embed/XJpKqXm.mp4'

      expect(codepenResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('codepenWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, codepenWidgetEmbedResolver)

  describe('Variant #1: the anchor block the ei.js loader replaces', () => {
    it('should read the pen out of the data attributes', async () => {
      const value = html`
        <p
          class="codepen"
          data-height="437"
          data-theme-id="default"
          data-default-tab="css,result"
          data-user="@argyleink"
          data-slug-hash="XJpKqXm"
          data-pen-title="Parallax Card"
        >
          <span
            >See the Pen
            <a href="https://codepen.io/argyleink/pen/XJpKqXm">Parallax Card</a> by Adam Argyle (<a
              href="https://codepen.io/argyleink"
              >@argyleink</a
            >) on <a href="https://codepen.io">CodePen</a>.</span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?default-tabs=css%2Cresult&theme-id=default',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        title: 'Parallax Card',
        height: 437,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // About one anchor block in nine states no `data-user`, and the sentence's own pen link
    // still names the author.
    it('should recover the author from the pen link when data-user is missing', async () => {
      const value = html`
        <p
          class="codepen"
          data-height="300"
          data-slug-hash="XJpKqXm"
        >
          <span
            >See the Pen <a href="https://codepen.io/argyleink/pen/XJpKqXm">Parallax Card</a> on
            <a href="https://codepen.io">CodePen</a>.</span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        title: 'Parallax Card',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // With nobody named anywhere the pen still plays and still has a screenshot, because the
    // slug alone selects it. Only the public page needs the author, so no `url` is minted.
    it('should still resolve when no author is named at all', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
        >
          <span>See the Pen on CodePen.</span>
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/anon/embed/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/anon/pen/XJpKqXm-512.jpg',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The block's own attribute names a person and cannot say "team", so the team prefix reaches
    // the placeholder only through the sentence's pen link.
    it('should keep the team prefix when the pen link names a team', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
        >
          <span
            >See the Pen
            <a href="https://codepen.io/team/keyframers/pen/XJpKqXm">A Team Pen</a> on
            <a href="https://codepen.io">CodePen</a>.</span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/keyframers/embed/XJpKqXm',
        url: 'https://codepen.io/team/keyframers/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/keyframers/pen/XJpKqXm-512.jpg',
        author: '@keyframers',
        title: 'A Team Pen',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The pen link names the pen and its owner together, so it outranks a `data-user` that says
    // otherwise: a copied block keeps a stale attribute while the link still points at the pen.
    // Without this the three addresses named three different people.
    it('should trust the pen link over a data-user that disagrees', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="mallory"
        >
          <span
            >See the Pen <a href="https://codepen.io/alice/pen/XJpKqXm">Parallax Card</a></span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/alice/embed/XJpKqXm',
        url: 'https://codepen.io/alice/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/alice/pen/XJpKqXm-512.jpg',
        author: '@alice',
        title: 'Parallax Card',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // `data-user` cannot say "team", so the link has to outrank it. Seeding the owner path from
    // the attribute made the same pen resolve to two different pages depending on its presence.
    it('should keep the team prefix even when data-user names the team', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="keyframers"
        >
          <span
            >See the Pen
            <a href="https://codepen.io/team/keyframers/pen/XJpKqXm">A Team Pen</a></span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/keyframers/embed/XJpKqXm',
        url: 'https://codepen.io/team/keyframers/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/keyframers/pen/XJpKqXm-512.jpg',
        author: '@keyframers',
        title: 'A Team Pen',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should take the title from the pen link when data-pen-title is missing', async () => {
      const value = html`
        <p
          class="codepen"
          data-user="chriscoyier"
          data-slug-hash="gfdDu"
        >
          <span
            >See the Pen <a href="https://codepen.io/chriscoyier/pen/gfdDu">A Legacy Pen</a> by
            Chris Coyier on <a href="https://codepen.io">CodePen</a>.</span
          >
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'gfdDu',
        src: 'https://codepen.io/chriscoyier/embed/gfdDu',
        url: 'https://codepen.io/chriscoyier/pen/gfdDu',
        thumbnail: 'https://shots.codepen.io/chriscoyier/pen/gfdDu-512.jpg',
        author: '@chriscoyier',
        title: 'A Legacy Pen',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #1b: the pre-2018 form, attributes before the class', () => {
    it('should read a five-character legacy slug', async () => {
      const value = html`
        <p
          data-height="268"
          data-theme-id="0"
          data-slug-hash="pFzlJ"
          data-default-tab="result"
          data-user="@wesbos"
          class="codepen"
        >
          See the Pen <a href="https://codepen.io/wesbos/pen/pFzlJ/">Flexbox Demo</a> by Wes Bos (<a
            href="https://codepen.io/wesbos"
            >@wesbos</a
          >) on <a href="https://codepen.io">CodePen</a>.
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'pFzlJ',
        src: 'https://codepen.io/wesbos/embed/pFzlJ?default-tabs=result&theme-id=0',
        url: 'https://codepen.io/wesbos/pen/pFzlJ',
        thumbnail: 'https://shots.codepen.io/wesbos/pen/pFzlJ-512.jpg',
        author: '@wesbos',
        title: 'Flexbox Demo',
        height: 268,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #1c: a div rather than a paragraph', () => {
    it('should read the block whatever element carries it', async () => {
      const value = html`
        <div
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="argyleink"
        >
          <span>See the Pen on <a href="https://codepen.io">CodePen</a>.</span>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // The loader copies both into the query of the iframe it builds, spelling the panes plural
  // there whatever the attribute is called. They describe the player, so the pen's own page,
  // which has no panes to choose, must not carry them.
  describe('the panes and theme the author picked', () => {
    it('should put them on the player and keep them off the pen page', async () => {
      const value = html`
        <p
          class="codepen"
          data-default-tab="js,result"
          data-theme-id="dark"
          data-user="argyleink"
          data-slug-hash="XJpKqXm"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?default-tabs=js%2Cresult&theme-id=dark',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a pane value that is not one', async () => {
      const value = html`
        <p
          class="codepen"
          data-default-tab="<script>"
          data-user="argyleink"
          data-slug-hash="XJpKqXm"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // What the dialog wrote before `data-slug-hash` existed. The loader still maps one onto the
  // other, so these blocks still build a player and would otherwise reach a reader as a sentence.
  describe('the legacy data-href spelling', () => {
    it('should read the pen from a whole url in data-href', async () => {
      const value = html`
        <p
          class="codepen"
          data-height="300"
          data-href="https://codepen.io/argyleink/pen/XJpKqXm"
        >
          <span>See the Pen <a href="https://codepen.io/argyleink/pen/XJpKqXm">Parallax</a>
          </span>
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        title: 'Parallax',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The url in `data-href` is the player's own, so the height the author picked can sit in its
    // query with no `data-height` beside it.
    it('should take the height from the url when the block states none', async () => {
      const value = html`
        <p
          class="codepen"
          data-href="https://codepen.io/argyleink/pen/XJpKqXm?height=600"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The loader reads a signed token off the block and appends it to the player it builds, so a
    // private pen embedded this way names its key here and nowhere else.
    it('should carry a token stated on the block', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="argyleink"
          data-token="eyJhbGci.eyJzdWIi.SflKxwRJ"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?token=eyJhbGci.eyJzdWIi.SflKxwRJ',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm?token=eyJhbGci.eyJzdWIi.SflKxwRJ',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read a bare slug in data-href', async () => {
      const value = html`
        <p
          class="codepen"
          data-href="XJpKqXm"
          data-user="argyleink"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore a data-href naming something that is not a pen', async () => {
      const value = html`
        <p
          class="codepen"
          data-href="https://codepen.io/argyleink/collection/abcdef"
        ></p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  // A prefill block ships its code inline as `<pre>` children with no saved pen behind it, so
  // there is nothing to mint and the code is the content. It must stay exactly as it arrived.
  describe('shapes that carry no saved pen', () => {
    it('should ignore a prefill block', async () => {
      const value = html`
        <div
          class="codepen"
          data-prefill='{"title":"Demo"}'
          data-height="400"
        >
          <pre data-lang="html">&lt;h1&gt;Hi&lt;/h1&gt;</pre>
        </div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('sad paths', () => {
    it('should ignore a block naming no pen', async () => {
      const value = '<p class="codepen"><span>See the Pen on CodePen.</span></p>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a slug that is not a pen id', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="not a slug"
        >
          <span>See the Pen</span>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The attribute alone is not the platform: other embed plugins carry their own slug hashes.
    it('should ignore a slug hash on a block that is not CodePen', async () => {
      const value = html`
        <p
          class="gist"
          data-slug-hash="XJpKqXm"
        >
          <span>Some other widget</span>
        </p>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The share dialog writes the handle with its `@` and the url path carries both spellings.
    it('should strip the at sign from the stated handle', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="@argyleink"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The block extends the class rather than replacing it, which is what themes do.
    it('should read a block carrying extra classes', async () => {
      const value = html`
        <p
          class="codepen embed-responsive"
          data-slug-hash="XJpKqXm"
          data-user="argyleink"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A pen link to a different pen belongs to the prose around the block, not to the block.
    it('should not take the author from a link naming another pen', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
        >
          <span>Compare with <a href="https://codepen.io/someoneelse/pen/aBcDeFg">this one</a>.</span>
        </p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/anon/embed/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/anon/pen/XJpKqXm-512.jpg',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // `anon` is what the share dialog writes for an author who asked not to be named, so it
    // names nobody and must not become a link to a profile of that name.
    it('should treat the anonymous handle as no author', async () => {
      const value = html`
        <p
          class="codepen"
          data-slug-hash="XJpKqXm"
          data-user="anon"
        ></p>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/anon/embed/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/anon/pen/XJpKqXm-512.jpg',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

describeForEachParser('codepenIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, codepenIframeEmbedResolver)

  describe('Variant #2: the player iframe', () => {
    it('should take the name out of the stated title', async () => {
      const value = html`
        <iframe
          height="400"
          style="width: 100%;"
          scrolling="no"
          title="Parallax Card"
          src="https://codepen.io/argyleink/embed/XJpKqXm?default-tab=js%2Cresult"
          loading="lazy"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?default-tab=js%2Cresult',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        title: 'Parallax Card',
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The share path CodePen writes when the author is not named. The slug still selects the
    // pen, so the player and the screenshot both work without one.
    it('should resolve the anonymous share path without an author', async () => {
      const value = html`
        <iframe
          height="331"
          src="https://codepen.io/anon/embed/XJpKqXm?theme-id=dark"
          title="CodePen Embed"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/anon/embed/XJpKqXm?theme-id=dark',
        thumbnail: 'https://shots.codepen.io/anon/pen/XJpKqXm-512.jpg',
        height: 331,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // Three sources, in the order the publisher's own intent runs out: the box they laid out, the
  // number the loader put in the query, then CodePen's own default for a player that says nothing.
  describe('how tall the player is', () => {
    it('should take the height stated in the query when no attribute states one', async () => {
      const value = '<iframe src="https://codepen.io/argyleink/embed/XJpKqXm?height=600"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?height=600',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The attribute is the box the publisher actually laid out, so it outranks the query.
    it('should prefer the stated attribute over the query', async () => {
      const value = html`
        <iframe
          height="450"
          src="https://codepen.io/argyleink/embed/XJpKqXm?height=600"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?height=600',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 450,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the height CodePen defaults to', async () => {
      const value = '<iframe src="https://codepen.io/argyleink/embed/XJpKqXm"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A zero is a height nobody laid out, so the player takes the default as if it stated none.
    it('should treat a height of zero as no height at all', async () => {
      const value = '<iframe src="https://codepen.io/argyleink/embed/XJpKqXm?height=0"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?height=0',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A carrier that states a width and no height neither takes the default nor gets paired with
    // it: 800 by the default height would describe a box the publisher never asked for, and 800
    // on its own is a number the reader lays nothing out from.
    it('should keep the default height over a width the carrier stated', async () => {
      const value = '<iframe width="800" src="https://codepen.io/argyleink/embed/XJpKqXm"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A ratio inferred from an ancestor's responsive wrapper ranks below what a resolver states.
    // The default height is a resolver statement, a corpus-typical value for a pen that declares
    // none, so it stands over the wrapper the same as a measured height would. Only the carrier
    // itself outranks the resolver, and a wrapper is not the carrier.
    it('should keep the default height over a ratio inferred from a wrapper', async () => {
      const value = html`
        <div style="padding-bottom:56.25%">
          <iframe src="https://codepen.io/argyleink/embed/XJpKqXm"></iframe>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #2b: the deferred-loading preview path', () => {
    it('should read the pen from behind the preview segment', async () => {
      const value = html`
        <iframe
          id="cp_embed_XJpKqXm"
          src="https://codepen.io/argyleink/embed/preview/XJpKqXm?height=300&amp;slug-hash=XJpKqXm"
          title="Parallax Card"
          height="300"
          class="cp_embed_iframe"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/preview/XJpKqXm?height=300&slug-hash=XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        title: 'Parallax Card',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('Variant #2e: the class on the iframe rather than the block', () => {
    it('should resolve the player by its url whatever class it carries', async () => {
      const value = html`
        <iframe
          class="codepen"
          height="331"
          src="https://codepen.io/argyleink/embed/XJpKqXm?theme-id=dark"
          title="Untitled"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?theme-id=dark',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 331,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The selector matches every iframe, so the host check inside `extract` is what rejects
    // this one. A lookalike host would never reach it.
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/codepen.io/argyleink/embed/XJpKqXm"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // The resolver's own host list rejects subdomains, but the factory's gate lets them through
    // to `extract`, so the path here is deliberately a valid one.
    it('should ignore a subdomain even when the path names a pen', async () => {
      const value = '<iframe src="https://blog.codepen.io/argyleink/embed/XJpKqXm"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  // A private pen opens only for what its url carries, and CodePen gates them two ways: the
  // share dialog's `key` and a signed `token`. Dropping either from the pen page would leave the
  // placeholder linking to something the reader cannot open.
  describe('a private pen, reachable only with what unlocks it', () => {
    it('should carry a signed token into both addresses', async () => {
      const value = html`
        <iframe
          height="400"
          src="https://codepen.io/argyleink/embed/XJpKqXm?token=eyJhbGci.eyJzdWIi.SflKxwRJ"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?token=eyJhbGci.eyJzdWIi.SflKxwRJ',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm?token=eyJhbGci.eyJzdWIi.SflKxwRJ',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // A feed that encoded its html twice leaves `&amp;` in the url, which turns the parameter
    // after it into `amp;key`. The pen page would silently lose what unlocks it.
    it('should still find the key behind a doubly-encoded ampersand', async () => {
      const value = html`
        <iframe
          height="400"
          src="https://codepen.io/argyleink/embed/XJpKqXm?height=600&amp;amp;key=abc123XYZ"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?height=600&amp;key=abc123XYZ',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm?key=abc123XYZ',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the key into both addresses', async () => {
      const value = html`
        <iframe
          height="400"
          src="https://codepen.io/argyleink/embed/XJpKqXm?key=abc123XYZ"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm?key=abc123XYZ',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm?key=abc123XYZ',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 400,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('titles the snippet writes when the pen has none', () => {
    // The player writes its own name in place of a missing title, naming the carrier and the
    // author but never the pen.
    it('should drop the CodePen by author title', async () => {
      const value = html`
        <iframe
          src="https://codepen.io/argyleink/embed/XJpKqXm"
          title="CodePen by @argyleink"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // These name the carrier rather than the pen, so a placeholder is better off without them.
    it('should drop the generic CodePen Embed title', async () => {
      const value = html`
        <iframe
          src="https://codepen.io/argyleink/embed/XJpKqXm"
          title="CodePen Embed"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codepen',
        id: 'XJpKqXm',
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        author: '@argyleink',
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The Embedly wrapper and the plain-link forms only reach their final state after earlier passes
// have unwrapped or left them alone, so the assertion belongs at the end of the pipeline.
describeForEachParser('codepen shapes the pipeline settles first', (parseHtml) => {
  const convert = (value: string): Promise<string> => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  describe('Variant #1: the anchor block and its loader', () => {
    const value = html`
      <p
        class="codepen"
        data-height="437"
        data-user="@argyleink"
        data-slug-hash="XJpKqXm"
        data-pen-title="Parallax Card"
      >
        <span
          >See the Pen
          <a href="https://codepen.io/argyleink/pen/XJpKqXm">Parallax Card</a> by Adam Argyle (<a
            href="https://codepen.io/argyleink"
            >@argyleink</a
          >) on <a href="https://codepen.io">CodePen</a>.</span
        >
      </p>
      <script
        async
        src="https://cpwebassets.codepen.io/assets/embed/ei.js"
      ></script>
    `

    it('should turn the block into a placeholder', async () => {
      const expected: Record<string, string> = {
        src: 'https://codepen.io/argyleink/embed/XJpKqXm',
        provider: 'codepen',
        id: 'XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://shots.codepen.io/argyleink/pen/XJpKqXm-512.jpg',
        height: '437',
        title: 'Parallax Card',
        author: '@argyleink',
      }

      expect(await placeholder(value)).toEqual(expected)
    })

    it('should leave none of the loader behind', async () => {
      expect(await convert(value)).not.toContain('ei.js')
    })
  })

  // Embedly proxies the whole embed for platforms that route third-party content through it.
  // `rebuildEmbedlyEmbeds` unwraps it to the inner player before the widget pass, and the poster
  // Embedly names is the exact frame the publisher chose, so it outranks the derived screenshot.
  describe('Variant #3: the Embedly-proxied player', () => {
    it('should resolve the inner pen and keep the proxied poster', async () => {
      const value = html`
        <iframe
          src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fcodepen.io%2Fargyleink%2Fembed%2Fpreview%2FXJpKqXm%3Fheight%3D600&amp;display_name=CodePen&amp;url=https%3A%2F%2Fcodepen.io%2Fargyleink%2Fpen%2FXJpKqXm&amp;image=https%3A%2F%2Fassets.codepen.io%2F2869%2Finternal%2Fscreenshots%2Fpens%2FXJpKqXm.default.png&amp;type=text%2Fhtml&amp;schema=codepen"
          width="800"
          height="600"
        ></iframe>
      `
      const expected: Record<string, string> = {
        src: 'https://codepen.io/argyleink/embed/preview/XJpKqXm?height=600',
        provider: 'codepen',
        id: 'XJpKqXm',
        url: 'https://codepen.io/argyleink/pen/XJpKqXm',
        thumbnail: 'https://assets.codepen.io/2869/internal/screenshots/pens/XJpKqXm.default.png',
        author: '@argyleink',
        height: '600',
      }

      expect(await placeholder(value)).toEqual(expected)
    })
  })

  describe('shapes that are not an embed', () => {
    // Plain pen links are 28.5% of the corpus and bare-text urls another 41.5%. Replacing either
    // would turn a sentence in a tutorial into a player.
    it('should leave a pen link in prose alone', async () => {
      const value = html`
        <p>Look at <a href="https://codepen.io/argyleink/pen/XJpKqXm">this pen</a>.</p>
      `

      expect(await convert(value)).toBe(value)
    })

    // The linkifier claims it like any other bare url, which is its business rather than this
    // suite's. What matters is that no resolver turns a url pasted into show notes into a player.
    it('should not build a placeholder from a bare pen url', async () => {
      const value = '<p>Demo: https://codepen.io/argyleink/pen/XJpKqXm</p>'
      const expected: Record<string, string> = {}

      expect(await placeholder(value)).toEqual(expected)
    })
  })
})

// The enclosure probe offers every attachment a feed carries to this resolver, and CodePen serves
// uploads on its own host, so the slug alphabet is what keeps a file playable.
describeForEachParser('codepen through the pipeline', (parseHtml) => {
  it('should leave a video enclosure on the codepen host playable', async () => {
    const enclosures = [
      { url: 'https://codepen.io/argyleink/embed/XJpKqXm.mp4', type: 'video/mp4' },
    ]

    const expected = html`
      <video data-enclosure="" controls src="https://codepen.io/argyleink/embed/XJpKqXm.mp4"></video>
      <p>Body</p>
    `

    expect(
      await transformContent('<p>Body</p>', {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
        enclosures,
      }),
    ).toEqualHtml(expected)
  })
})
